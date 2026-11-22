"""GAIA accounts: sign-up, sign-in, sign-out for farmers, cooperatives and partners.

Storage: one SQLite file (GAIA_USERS_DB, default backend/data/users.db, git-ignored).
Passwords: PBKDF2-HMAC-SHA256, 200,000 iterations, random 16-byte salt per user; never stored
or logged in clear. Sessions: random 256-bit token given to the browser once; only its SHA-256
is stored, so a copy of the database cannot be used to sign in. Sessions last 30 days and
sign-out deletes them. Repeated wrong passwords lock the identifier for 15 minutes.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import math
import os
import re
import secrets
import smtplib
import sqlite3
from email.message import EmailMessage
import threading
import time
from pathlib import Path
from typing import Optional

ITERATIONS = 200_000
SESSION_DAYS = 30
MAX_FAILS, LOCK_S = 5, 15 * 60
ROLES = {"farmer", "cooperative", "agronomist", "partner"}

_lock = threading.Lock()
_fails: dict[str, list[float]] = {}


def _env(name: str, default: Optional[str] = None) -> Optional[str]:
    """Environment variable, else backend/.env (git-ignored), else default."""
    v = os.environ.get(name, "").strip()
    if v:
        return v
    f = Path(os.environ.get("GAIA_ENV_FILE") or Path(__file__).resolve().parent.parent / ".env")
    try:
        for line in f.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith(name + "="):
                v = line.split("=", 1)[1].strip().strip('"').strip("'")
                return v or default
    except OSError:
        pass
    return default


class AuthError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def db_path() -> Path:
    return Path(os.environ.get("GAIA_USERS_DB", Path(__file__).resolve().parent.parent / "data" / "users.db"))


def _conn() -> sqlite3.Connection:
    p = db_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(p)
    c.row_factory = sqlite3.Row
    c.execute("""CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, identifier TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
        role TEXT NOT NULL, region TEXT, salt BLOB NOT NULL, pw_hash BLOB NOT NULL, created_at REAL NOT NULL)""")
    c.execute("""CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at REAL NOT NULL, expires_at REAL NOT NULL)""")
    # the farm linked to the account (added after the first version: add the columns when missing)
    have = {r["name"] for r in c.execute("PRAGMA table_info(users)")}
    for col, typ in (("lat", "REAL"), ("lon", "REAL"), ("crop", "TEXT"), ("water", "TEXT"), ("share", "INTEGER DEFAULT 0"),
                     ("is_admin", "INTEGER DEFAULT 0")):      # given on the server only (gaia/admin.py)
        if col not in have:
            c.execute(f"ALTER TABLE users ADD COLUMN {col} {typ}")
    c.execute("""CREATE TABLE IF NOT EXISTS reset_codes (
        user_id INTEGER PRIMARY KEY, code_hash TEXT NOT NULL, expires_at REAL NOT NULL, attempts INTEGER NOT NULL DEFAULT 0)""")
    c.execute("""CREATE TABLE IF NOT EXISTS share_requests (
        from_id INTEGER NOT NULL, to_id INTEGER NOT NULL, status TEXT NOT NULL, created_at REAL NOT NULL,
        PRIMARY KEY (from_id, to_id))""")
    c.execute("""CREATE TABLE IF NOT EXISTS admin_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, at REAL NOT NULL, action TEXT NOT NULL)""")
    return c


def normalize_identifier(raw: str) -> str:
    """Email (lower-case) or phone number (digits, optional leading +)."""
    s = (raw or "").strip()
    if "@" in s:
        s = s.lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", s):
            raise AuthError(422, "bad_identifier", "Enter a valid email or phone number.")
        return s
    digits = re.sub(r"[\s\-().]", "", s)
    if not re.fullmatch(r"\+?\d{8,15}", digits):
        raise AuthError(422, "bad_identifier", "Enter a valid email or phone number.")
    return digits


def _hash(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS)


def _public(row: sqlite3.Row) -> dict:
    keys = row.keys()
    farm = None
    if "lat" in keys and row["lat"] is not None:
        # the owner sees their own coordinates; neighbours never do (see neighbours())
        farm = {"lat": row["lat"], "lon": row["lon"], "crop": row["crop"], "water": row["water"], "share": bool(row["share"])}
    return {"id": row["id"], "name": row["name"], "role": row["role"], "region": row["region"],
            "identifier": row["identifier"], "created_at": row["created_at"], "farm": farm, "admin": bool(row["is_admin"])}


CROPS = {"olive", "palm", "citrus", "cereal", "veg", "other"}
WATERS = {"rainfed", "well", "network", "shared"}


def _clean_farm(farm: Optional[dict]) -> Optional[dict]:
    if not farm:
        return None
    try:
        lat, lon = float(farm.get("lat")), float(farm.get("lon"))
    except (TypeError, ValueError):
        raise AuthError(422, "bad_farm", "The plot position is not valid.")
    if not (30 <= lat <= 38 and 7 <= lon <= 12):
        raise AuthError(422, "bad_farm", "The plot must be in Tunisia.")
    crop = farm.get("crop") if farm.get("crop") in CROPS else None
    water = farm.get("water") if farm.get("water") in WATERS else None
    return {"lat": round(lat, 5), "lon": round(lon, 5), "crop": crop, "water": water, "share": 1 if farm.get("share") else 0}


def _new_session(c: sqlite3.Connection, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    now = time.time()
    c.execute("INSERT INTO sessions VALUES (?, ?, ?, ?)",
              (hashlib.sha256(token.encode()).hexdigest(), user_id, now, now + SESSION_DAYS * 86400))
    c.execute("DELETE FROM sessions WHERE expires_at < ?", (now,))
    return token


def signup(name: str, identifier: str, password: str, role: str = "farmer", region: Optional[str] = None,
           farm: Optional[dict] = None) -> dict:
    name = (name or "").strip()
    if not 1 <= len(name) <= 80:
        raise AuthError(422, "bad_name", "Enter your name (80 characters at most).")
    if len(password or "") < 8 or len(password) > 200:
        raise AuthError(422, "weak_password", "The password needs at least 8 characters.")
    if role not in ROLES:
        role = "farmer"
    region = (region or "").strip()[:80] or None
    ident = normalize_identifier(identifier)
    f = _clean_farm(farm) or {"lat": None, "lon": None, "crop": None, "water": None, "share": 0}
    salt = secrets.token_bytes(16)
    with _lock, _conn() as c:
        if c.execute("SELECT 1 FROM users WHERE identifier = ?", (ident,)).fetchone():
            raise AuthError(409, "exists", "An account already uses this email or phone number.")
        cur = c.execute("""INSERT INTO users (identifier, name, role, region, salt, pw_hash, created_at, lat, lon, crop, water, share)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (ident, name, role, region, salt, _hash(password, salt), time.time(), f["lat"], f["lon"], f["crop"], f["water"], f["share"]))
        row = c.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
        return {"token": _new_session(c, row["id"]), "user": _public(row)}


def login(identifier: str, password: str) -> dict:
    ident = normalize_identifier(identifier)
    now = time.time()
    with _lock:
        recent = [t for t in _fails.get(ident, []) if now - t < LOCK_S]
        _fails[ident] = recent
        if len(recent) >= MAX_FAILS:
            raise AuthError(429, "locked", "Too many attempts. Try again in 15 minutes.")
        with _conn() as c:
            row = c.execute("SELECT * FROM users WHERE identifier = ?", (ident,)).fetchone()
            # same work whether the account exists or not, so timing does not reveal accounts
            salt = row["salt"] if row else b"\0" * 16
            ok = hmac.compare_digest(_hash(password or "", salt), row["pw_hash"] if row else b"\0" * 32) and row is not None
            if not ok:
                _fails[ident].append(now)
                raise AuthError(401, "bad_credentials", "Wrong email/phone or password.")
            _fails.pop(ident, None)
            return {"token": _new_session(c, row["id"]), "user": _public(row)}


def user_for(token: Optional[str]) -> Optional[dict]:
    if not token:
        return None
    with _conn() as c:
        row = c.execute("""SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
                           WHERE s.token_hash = ? AND s.expires_at > ?""",
                        (hashlib.sha256(token.encode()).hexdigest(), time.time())).fetchone()
        return _public(row) if row else None


def _require(c: sqlite3.Connection, token: Optional[str]) -> sqlite3.Row:
    row = None
    if token:
        row = c.execute("""SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
                           WHERE s.token_hash = ? AND s.expires_at > ?""",
                        (hashlib.sha256(token.encode()).hexdigest(), time.time())).fetchone()
    if not row:
        raise AuthError(401, "no_session", "Not signed in.")
    return row


def require_admin(c: sqlite3.Connection, token: Optional[str]) -> sqlite3.Row:
    """The signed-in administrator, read from the database at each call. Never trust what the browser says."""
    me = _require(c, token)
    if not me["is_admin"]:
        raise AuthError(403, "not_admin", "Administrators only.")
    return me


def set_farm(token: Optional[str], farm: Optional[dict]) -> dict:
    """Link (or update, or remove with farm=None) the plot of the signed-in account."""
    f = _clean_farm(farm) or {"lat": None, "lon": None, "crop": None, "water": None, "share": 0}
    with _lock, _conn() as c:
        me = _require(c, token)
        c.execute("UPDATE users SET lat = ?, lon = ?, crop = ?, water = ?, share = ? WHERE id = ?",
                  (f["lat"], f["lon"], f["crop"], f["water"], f["share"], me["id"]))
        if not f["share"]:   # leaving the neighbour list withdraws pending requests
            c.execute("DELETE FROM share_requests WHERE (from_id = ? OR to_id = ?) AND status = 'pending'", (me["id"], me["id"]))
        return _public(c.execute("SELECT * FROM users WHERE id = ?", (me["id"],)).fetchone())


def _km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = math.pi / 180
    a = math.sin((lat2 - lat1) * r / 2) ** 2 + math.cos(lat1 * r) * math.cos(lat2 * r) * math.sin((lon2 - lon1) * r / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(a))


def _status(c: sqlite3.Connection, me: int, other: int) -> str:
    out = c.execute("SELECT status FROM share_requests WHERE from_id = ? AND to_id = ?", (me, other)).fetchone()
    inc = c.execute("SELECT status FROM share_requests WHERE from_id = ? AND to_id = ?", (other, me)).fetchone()
    if (out and out["status"] == "accepted") or (inc and inc["status"] == "accepted"):
        return "matched"
    if inc and inc["status"] == "pending":
        return "received"
    if out and out["status"] == "pending":
        return "sent"
    if out and out["status"] == "declined":
        return "declined"
    return "none"


def neighbours(token: Optional[str], radius_km: float = 5.0) -> dict:
    """Farmers who chose to be visible, within radius_km of my plot.

    Privacy: no coordinates are returned, only a distance rounded to 0.5 km; the email or phone
    number is shown only once both farmers have agreed to share (status 'matched')."""
    radius_km = max(0.5, min(30.0, float(radius_km)))
    with _conn() as c:
        me = _require(c, token)
        if me["lat"] is None:
            raise AuthError(409, "no_farm", "Link your plot to your account first.")
        out = []
        for u in c.execute("SELECT * FROM users WHERE id != ? AND share = 1 AND lat IS NOT NULL", (me["id"],)):
            d = _km(me["lat"], me["lon"], u["lat"], u["lon"])
            st = _status(c, me["id"], u["id"])
            if d > radius_km and st != "matched":
                continue
            item = {"id": u["id"], "name": u["name"].split()[0], "role": u["role"], "region": u["region"], "crop": u["crop"],
                    "water": u["water"], "distance_km": max(0.5, round(d * 2) / 2), "status": st}
            if st == "matched":
                item["name"], item["contact"] = u["name"], u["identifier"]
            out.append(item)
        out.sort(key=lambda x: (x["status"] != "received", x["status"] != "matched", x["distance_km"]))
        return {"radius_km": radius_km, "visible": bool(me["share"]), "neighbours": out}


def request_share(token: Optional[str], to_id: int, radius_km: float = 30.0) -> dict:
    with _lock, _conn() as c:
        me = _require(c, token)
        if me["lat"] is None or not me["share"]:
            raise AuthError(409, "no_farm", "Link your plot and agree to be visible to neighbours first.")
        other = c.execute("SELECT * FROM users WHERE id = ? AND share = 1 AND lat IS NOT NULL", (to_id,)).fetchone()
        if not other or other["id"] == me["id"] or _km(me["lat"], me["lon"], other["lat"], other["lon"]) > radius_km:
            raise AuthError(404, "no_neighbour", "This neighbour is not available.")
        inc = c.execute("SELECT status FROM share_requests WHERE from_id = ? AND to_id = ?", (to_id, me["id"])).fetchone()
        if inc and inc["status"] == "pending":   # they already asked me: asking back is agreeing
            c.execute("UPDATE share_requests SET status = 'accepted' WHERE from_id = ? AND to_id = ?", (to_id, me["id"]))
        else:
            c.execute("INSERT OR REPLACE INTO share_requests VALUES (?, ?, 'pending', ?)", (me["id"], to_id, time.time()))
        return {"status": _status(c, me["id"], to_id)}


def respond_share(token: Optional[str], from_id: int, accept: bool) -> dict:
    with _lock, _conn() as c:
        me = _require(c, token)
        r = c.execute("SELECT status FROM share_requests WHERE from_id = ? AND to_id = ?", (from_id, me["id"])).fetchone()
        if not r or r["status"] != "pending":
            raise AuthError(404, "no_request", "No pending request from this neighbour.")
        c.execute("UPDATE share_requests SET status = ? WHERE from_id = ? AND to_id = ?", ("accepted" if accept else "declined", from_id, me["id"]))
        return {"status": _status(c, me["id"], from_id)}


RESET_MIN, RESET_TRIES = 15, 5
log = logging.getLogger("gaia.auth")


def _wa_number(identifier: str) -> str:
    """WhatsApp wants the full international number without '+': a Tunisian 8-digit number gets 216."""
    d = identifier.lstrip("+")
    return "216" + d if len(d) == 8 else d


def _channel(identifier: str) -> Optional[str]:
    if "@" in identifier:
        return "email" if _env("GAIA_SMTP_HOST") else None
    return "whatsapp" if _env("GAIA_WA_TOKEN") and _env("GAIA_WA_PHONE_ID") else None


def _send_whatsapp(identifier: str, code: str) -> None:
    """WhatsApp Business Cloud API (Meta). Needs an approved 'authentication' template that takes
    the code as its single parameter (and, by default, a copy-code button)."""
    import httpx
    comps = [{"type": "body", "parameters": [{"type": "text", "text": code}]}]
    if _env("GAIA_WA_OTP_BUTTON", "1") != "0":
        comps.append({"type": "button", "sub_type": "url", "index": "0", "parameters": [{"type": "text", "text": code}]})
    r = httpx.post(
        f"https://graph.facebook.com/{_env('GAIA_WA_API_VERSION', 'v21.0')}/{_env('GAIA_WA_PHONE_ID')}/messages",
        headers={"Authorization": "Bearer " + _env("GAIA_WA_TOKEN")},
        json={"messaging_product": "whatsapp", "to": _wa_number(identifier), "type": "template",
              "template": {"name": _env("GAIA_WA_TEMPLATE", "gaia_code"),
                           "language": {"code": _env("GAIA_WA_LANG", "fr")}, "components": comps}},
        timeout=15)
    if r.status_code >= 300:
        raise RuntimeError(f"WhatsApp API {r.status_code}: {r.text[:200]}")


def _deliver(identifier: str, name: str, code: str) -> str:
    """Send the reset code: email through SMTP (GAIA_SMTP_HOST) for an email, WhatsApp through the
    Meta Cloud API (GAIA_WA_TOKEN + GAIA_WA_PHONE_ID) for a phone number. Without them, the code
    is written to the server console (and shown on the page in the local demo)."""
    host = _env("GAIA_SMTP_HOST")
    if _channel(identifier) == "whatsapp":
        _send_whatsapp(identifier, code)
        return "whatsapp"
    if host and "@" in identifier:
        msg = EmailMessage()
        msg["Subject"] = "GAIA : code de réinitialisation / reset code"
        msg["From"] = _env("GAIA_SMTP_FROM", _env("GAIA_SMTP_USER", "gaia@localhost"))
        msg["To"] = identifier
        msg.set_content(f"Bonjour {name},\n\nVotre code GAIA : {code}\nIl est valable {RESET_MIN} minutes.\n\n"
                        f"Your GAIA code: {code} (valid {RESET_MIN} minutes).\n\nSi vous n'avez rien demandé, ignorez ce message.")
        with smtplib.SMTP(host, int(_env("GAIA_SMTP_PORT", "587")), timeout=15) as s:
            s.starttls()
            if _env("GAIA_SMTP_USER"):
                s.login(_env("GAIA_SMTP_USER"), _env("GAIA_SMTP_PASSWORD", ""))
            s.send_message(msg)
        return "email"
    print(f"[GAIA] password reset code for {identifier}: {code} (valid {RESET_MIN} min)", flush=True)
    return "console"


def request_reset(identifier: str, local_demo: bool = False) -> dict:
    """Always the same answer, whether the account exists or not (no account discovery).

    local_demo: the request comes from this computer and no email service is configured. The
    code is then also returned so the demo page can show it (it would otherwise only be in the
    server console). Never on a request from another machine, never once SMTP is configured."""
    ident = normalize_identifier(identifier)
    real = _channel(ident)   # 'email', 'whatsapp' or None
    demo = local_demo and not real and _env("GAIA_RESET_DEMO", "1") != "0"
    out = {"sent": True, "minutes": RESET_MIN, "channel": real or ("demo" if demo else "console")}
    with _lock, _conn() as c:
        row = c.execute("SELECT id, name FROM users WHERE identifier = ?", (ident,)).fetchone()
        if row:
            code = f"{secrets.randbelow(1_000_000):06d}"
            c.execute("INSERT OR REPLACE INTO reset_codes VALUES (?, ?, ?, 0)",
                      (row["id"], hashlib.sha256(code.encode()).hexdigest(), time.time() + RESET_MIN * 60))
            try:
                _deliver(ident, row["name"], code)
            except Exception as e:   # never reveal through an error that the account exists
                log.warning("reset code delivery failed: %s", e)
                print(f"[GAIA] could not send the reset code ({e}); code for {ident}: {code} (valid {RESET_MIN} min)", flush=True)
            if demo:
                out["demo_code"] = code
    return out


def confirm_reset(identifier: str, code: str, password: str) -> dict:
    if len(password or "") < 8 or len(password) > 200:
        raise AuthError(422, "weak_password", "The password needs at least 8 characters.")
    ident = normalize_identifier(identifier)
    bad = AuthError(400, "bad_code", "Wrong or expired code.")
    with _lock, _conn() as c:
        row = c.execute("SELECT * FROM users WHERE identifier = ?", (ident,)).fetchone()
        rc = c.execute("SELECT * FROM reset_codes WHERE user_id = ?", (row["id"],)).fetchone() if row else None
        if not rc or rc["expires_at"] < time.time() or rc["attempts"] >= RESET_TRIES:
            raise bad
        if not hmac.compare_digest(hashlib.sha256((code or "").strip().encode()).hexdigest(), rc["code_hash"]):
            c.execute("UPDATE reset_codes SET attempts = attempts + 1 WHERE user_id = ?", (row["id"],))
            raise bad
        salt = secrets.token_bytes(16)
        c.execute("UPDATE users SET salt = ?, pw_hash = ? WHERE id = ?", (salt, _hash(password, salt), row["id"]))
        c.execute("DELETE FROM reset_codes WHERE user_id = ?", (row["id"],))
        c.execute("DELETE FROM sessions WHERE user_id = ?", (row["id"],))   # sign out everywhere
        _fails.pop(ident, None)
        return {"token": _new_session(c, row["id"]), "user": _public(row)}


def logout(token: Optional[str]) -> None:
    if not token:
        return
    with _lock, _conn() as c:
        c.execute("DELETE FROM sessions WHERE token_hash = ?", (hashlib.sha256(token.encode()).hexdigest(),))
