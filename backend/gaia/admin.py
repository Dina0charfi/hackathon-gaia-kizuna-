"""Admin dashboard: everything GAIA knows about the farms, for administrators only, read only.

Nobody becomes administrator from the web site: the right is given on the server, to an account that exists.

    cd backend
    python -m gaia.admin list
    python -m gaia.admin grant someone@example.com
    python -m gaia.admin revoke someone@example.com

Passwords, salts, session tokens and reset codes are never read here. Each consultation is written in admin_log.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Optional

from . import auth, farm_state

LOG_KEEP = 500


def _feedback_file() -> Path:
    return Path(os.environ.get("GAIA_FEEDBACK_FILE", Path(__file__).resolve().parent.parent / "data" / "feedback.jsonl"))


def _feedback(limit: int = 50) -> list[dict[str, Any]]:
    try:
        lines = _feedback_file().read_text(encoding="utf-8").splitlines()
    except OSError:
        return []
    out = []
    for line in lines[-limit:]:
        try:
            x = json.loads(line)
        except ValueError:
            continue
        out.append({"at": x.get("at"), "kind": x.get("kind"), "role": x.get("role"), "text": str(x.get("text", ""))[:500], "status": x.get("expert_status")})
    return out[::-1]


def _records() -> list[dict[str, Any]]:
    out = []
    for s in farm_state.all_parcels():
        log, alerts = s.get("irrigation_log") or [], s.get("alerts") or []
        out.append({"owner": s.get("owner"), "lat": s.get("lat"), "lon": s.get("lon"), "crop": (s.get("settings") or {}).get("crop"), "area_ha": (s.get("settings") or {}).get("area_ha"),
                    "planned_days": sum(1 for d in s.get("plan") or [] if not d.get("done")), "irrigations": len(log),
                    "last_irrigation": max((e.get("date", "") for e in log), default=None),
                    "monitoring": bool((s.get("monitoring") or {}).get("enabled")), "unread_alerts": sum(1 for a in alerts if not a.get("read")),
                    "last_alert": alerts[-1] if alerts else None})
    return out


def overview(token: Optional[str]) -> dict[str, Any]:
    """All the dashboard shows. 401 without a session, 403 when the account is not an administrator."""
    with auth._lock, auth._conn() as c:
        me = auth.require_admin(c, token)
        now = time.time()
        c.execute("INSERT INTO admin_log (user_id, at, action) VALUES (?, ?, 'overview')", (me["id"], now))
        c.execute("DELETE FROM admin_log WHERE id NOT IN (SELECT id FROM admin_log ORDER BY id DESC LIMIT ?)", (LOG_KEEP,))
        seen = {r["user_id"]: r["t"] for r in c.execute("SELECT user_id, MAX(created_at) AS t FROM sessions GROUP BY user_id")}
        # named columns only: the password hash and salt never leave the users table
        users = [dict(r) for r in c.execute("""SELECT id, name, identifier, role, region, created_at, lat, lon, crop, water, share, is_admin
                                               FROM users ORDER BY created_at DESC""")]
        shares = [dict(r) for r in c.execute("SELECT from_id, to_id, status, created_at FROM share_requests ORDER BY created_at DESC")]
        log = [dict(r) for r in c.execute("""SELECT l.at, l.action, u.name FROM admin_log l LEFT JOIN users u ON u.id = l.user_id
                                             ORDER BY l.id DESC LIMIT 20""")]
    records = _records()
    own: dict[int, int] = {}
    for r in records:
        if r["owner"] is not None:
            own[r["owner"]] = own.get(r["owner"], 0) + r["irrigations"]
    for u in users:
        u["share"], u["is_admin"] = bool(u["share"]), bool(u["is_admin"])
        u["last_sign_in"] = seen.get(u["id"])
        u["record"] = {"irrigations": own[u["id"]]} if u["id"] in own else None
    return {"generated_at": now, "users": users, "shares": shares, "records": records, "feedback": _feedback(), "log": log}


# ---------------------------------------------------------------- rights, from the server only
def set_admin(identifier: str, on: bool) -> bool:
    ident = auth.normalize_identifier(identifier)
    with auth._lock, auth._conn() as c:
        return c.execute("UPDATE users SET is_admin = ? WHERE identifier = ?", (1 if on else 0, ident)).rowcount == 1


def admins() -> list[str]:
    with auth._conn() as c:
        return [r["identifier"] for r in c.execute("SELECT identifier FROM users WHERE is_admin = 1")]


def main(argv: list[str]) -> int:
    if argv[:1] == ["list"]:
        print("\n".join(admins()) or "no administrator")
        return 0
    if len(argv) == 2 and argv[0] in ("grant", "revoke"):
        try:
            ok = set_admin(argv[1], argv[0] == "grant")
        except auth.AuthError as e:
            print(e.message)
            return 1
        print(("done: " + argv[0]) if ok else "no account uses this email or phone number: create it on account.html first")
        return 0 if ok else 1
    print("usage: python -m gaia.admin list | grant <email or phone> | revoke <email or phone>")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
