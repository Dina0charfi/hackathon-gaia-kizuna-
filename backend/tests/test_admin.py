"""Admin dashboard: administrators only, nothing secret, no way to become admin from the site."""
import importlib
import json

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def api(tmp_path, monkeypatch):
    monkeypatch.setenv("GAIA_USERS_DB", str(tmp_path / "users.db"))
    monkeypatch.setenv("GAIA_FEEDBACK_FILE", str(tmp_path / "feedback.jsonl"))
    from gaia import admin, auth, farm_state, main
    importlib.reload(auth)
    importlib.reload(admin)
    importlib.reload(main)
    monkeypatch.setattr(farm_state, "DIR", tmp_path / "farm")
    return TestClient(main.app), admin


def signup(c, ident, **kw):
    body = {"name": "Amel", "identifier": ident, "password": "olive-2026", "role": "farmer", "region": "Kairouan"}
    body.update(kw)
    r = c.post("/auth/signup", json=body)
    assert r.status_code == 201, r.text
    return r.json()["token"], r.json()["user"]


def H(tok):
    return {"Authorization": "Bearer " + tok}


def test_only_an_administrator_gets_in(api):
    c, admin = api
    tok, user = signup(c, "amel@example.com")
    assert c.get("/admin/overview").status_code == 401
    assert c.get("/admin/overview", headers=H("wrong")).status_code == 401
    assert user["admin"] is False and c.get("/admin/overview", headers=H(tok)).status_code == 403
    assert admin.set_admin("amel@example.com", True)
    assert c.get("/admin/overview", headers=H(tok)).status_code == 200
    assert c.get("/auth/me", headers=H(tok)).json()["user"]["admin"] is True
    assert admin.set_admin("amel@example.com", False)                      # takes effect at once, on the open session too
    assert c.get("/admin/overview", headers=H(tok)).status_code == 403


def test_nobody_becomes_admin_from_the_site(api):
    c, admin = api
    tok, user = signup(c, "evil@example.com", role="admin", is_admin=1, admin=True)
    assert user["role"] == "farmer" and user["admin"] is False
    c.put("/auth/farm", json={"lat": 35.6, "lon": 10.1, "is_admin": 1, "admin": True}, headers=H(tok))
    assert c.get("/admin/overview", headers=H(tok)).status_code == 403
    assert admin.set_admin("nobody@example.com", True) is False and admin.admins() == []


def test_overview_content_and_no_secret(api):
    c, admin = api
    from gaia import farm_state
    boss, _ = signup(c, "boss@example.com", role="agronomist")
    a, ua = signup(c, "a@example.com", name="Karim", farm={"lat": 35.68, "lon": 10.1, "crop": "olive", "water": "well", "share": True})
    b, ub = signup(c, "+216 98 123 456", name="Sami", farm={"lat": 35.69, "lon": 10.11, "crop": "cereal", "water": "well", "share": True})
    c.post("/share/request", json={"to": ub["id"]}, headers=H(a))
    farm_state.apply(35.68, 10.1, {"type": "log_irrigation", "params": {"mm": 8}})
    c.post("/feedback", json={"kind": "diagnosis", "text": "Ce n'est pas la bonne maladie"})
    admin.set_admin("boss@example.com", True)
    r = c.get("/admin/overview", headers=H(boss))
    d = r.json()
    k = next(u for u in d["users"] if u["name"] == "Karim")
    assert k["crop"] == "olive" and k["record"]["irrigations"] == 1 and k["last_sign_in"]
    assert len(d["users"]) == 3 and d["shares"][0]["status"] == "pending" and d["feedback"][0]["kind"] == "diagnosis"
    assert d["log"][0]["action"] == "overview"
    for secret in ("pw_hash", "salt", "token", "code_hash", "olive-2026", boss, a):
        assert secret not in json.dumps(d)


def test_command_line(api, capsys):
    c, admin = api
    signup(c, "amel@example.com")
    assert admin.main(["grant", "AMEL@example.com"]) == 0 and admin.admins() == ["amel@example.com"]
    assert admin.main(["grant", "ghost@example.com"]) == 1 and admin.main(["grant", "not an email"]) == 1
    assert admin.main(["revoke", "amel@example.com"]) == 0 and admin.admins() == []
    assert admin.main([]) == 2
