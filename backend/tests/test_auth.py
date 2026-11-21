"""Accounts: sign-up, sign-in, /auth/me, sign-out, lock-out. Uses a throw-away database."""
import importlib
import sqlite3

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("GAIA_USERS_DB", str(tmp_path / "users.db"))
    from gaia import auth, main
    importlib.reload(auth)
    importlib.reload(main)
    return TestClient(main.app)


def signup(client, **kw):
    body = {"name": "Amel", "identifier": "amel@example.com", "password": "olive-2026", "role": "farmer", "region": "Kairouan"}
    body.update(kw)
    return client.post("/auth/signup", json=body)


def test_signup_login_me_logout(client):
    r = signup(client)
    assert r.status_code == 201
    tok = r.json()["token"]
    assert r.json()["user"]["name"] == "Amel" and "password" not in r.text and "pw_hash" not in r.text

    me = client.get("/auth/me", headers={"Authorization": "Bearer " + tok})
    assert me.status_code == 200 and me.json()["user"]["region"] == "Kairouan"

    r2 = client.post("/auth/login", json={"identifier": "  AMEL@example.com ", "password": "olive-2026"})
    assert r2.status_code == 200 and r2.json()["token"] != tok

    assert client.post("/auth/logout", headers={"Authorization": "Bearer " + tok}).json() == {"signed_out": True}
    assert client.get("/auth/me", headers={"Authorization": "Bearer " + tok}).status_code == 401
    # the other session is still valid
    assert client.get("/auth/me", headers={"Authorization": "Bearer " + r2.json()["token"]}).status_code == 200


def test_password_and_token_never_stored_in_clear(client, tmp_path):
    tok = signup(client).json()["token"]
    raw = (tmp_path / "users.db").read_bytes()
    assert b"olive-2026" not in raw and tok.encode() not in raw


def test_rejections(client):
    assert signup(client, password="short").status_code == 422
    assert signup(client, identifier="not an email").status_code == 422
    assert signup(client).status_code == 201
    assert signup(client).status_code == 409                      # same identifier twice
    assert signup(client, identifier="+216 98 123 456").status_code == 201   # phone numbers work
    assert client.post("/auth/login", json={"identifier": "nobody@example.com", "password": "whatever1"}).status_code == 401
    assert client.get("/auth/me").status_code == 401


def H(tok):
    return {"Authorization": "Bearer " + tok}


def farmer(client, ident, lat, lon, crop="olive", share=True, name="Amel Ben Salah"):
    r = signup(client, identifier=ident, name=name, farm={"lat": lat, "lon": lon, "crop": crop, "water": "well", "share": share})
    assert r.status_code == 201, r.text
    return r.json()["token"], r.json()["user"]["id"]


def test_neighbours_match_and_privacy(client):
    a, a_id = farmer(client, "a@example.com", 35.6800, 10.1000, "olive", name="Amel Ben Salah")
    b, b_id = farmer(client, "b@example.com", 35.6950, 10.1100, "cereal", name="Karim Trabelsi")   # ~2 km away
    far, _ = farmer(client, "c@example.com", 36.8000, 10.1800)                                        # Tunis, ~125 km
    hidden, _ = farmer(client, "d@example.com", 35.6810, 10.1010, share=False)                       # next door, not visible

    n = client.get("/share/neighbours?radius_km=5", headers=H(a)).json()["neighbours"]
    assert [x["id"] for x in n] == [b_id]                      # far and hidden farmers are not listed
    x = n[0]
    assert x["name"] == "Karim" and x["crop"] == "cereal" and x["status"] == "none"
    assert 1.5 <= x["distance_km"] <= 2.5 and x["distance_km"] * 2 == int(x["distance_km"] * 2)   # rounded to 0.5 km
    assert "lat" not in x and "lon" not in x and "contact" not in x and "b@example.com" not in str(n)

    assert client.post("/share/request", json={"to": b_id}, headers=H(a)).json()["status"] == "sent"
    nb = client.get("/share/neighbours", headers=H(b)).json()["neighbours"]
    assert nb[0]["status"] == "received" and "contact" not in nb[0]

    assert client.post("/share/respond", json={"from_id": a_id, "accept": True}, headers=H(b)).json()["status"] == "matched"
    na = client.get("/share/neighbours", headers=H(a)).json()["neighbours"][0]
    assert na["status"] == "matched" and na["contact"] == "b@example.com" and na["name"] == "Karim Trabelsi"

    # a hidden farmer cannot be asked
    assert client.post("/share/request", json={"to": 4}, headers=H(a)).status_code == 404
    # without a session
    assert client.get("/share/neighbours").status_code == 401


def test_farm_link_and_unlink(client):
    tok = signup(client).json()["token"]
    assert client.get("/share/neighbours", headers=H(tok)).status_code == 409        # no plot yet
    u = client.put("/auth/farm", json={"lat": 35.0, "lon": 9.2, "crop": "veg", "water": "shared", "share": True}, headers=H(tok)).json()["user"]
    assert u["farm"]["crop"] == "veg" and u["farm"]["share"] is True
    assert client.put("/auth/farm", json={"lat": 48.8, "lon": 2.3}, headers=H(tok)).status_code == 422   # outside Tunisia
    assert client.get("/auth/me", headers=H(tok)).json()["user"]["farm"]["lat"] == 35.0


def test_forgot_password(client, capsys):
    old = signup(client).json()["token"]
    capsys.readouterr()
    # unknown account: same answer, nothing printed
    r0 = client.post("/auth/forgot", json={"identifier": "nobody@example.com"})
    assert r0.status_code == 200 and r0.json()["sent"] is True and "code" not in r0.text
    assert "reset code" not in capsys.readouterr().out
    r = client.post("/auth/forgot", json={"identifier": "amel@example.com"})
    assert r.json() == r0.json() and "code" not in r.text            # the code is never in the API answer
    out = capsys.readouterr().out
    code = out.split("amel@example.com: ")[1][:6]
    assert code.isdigit()
    assert client.post("/auth/reset", json={"identifier": "amel@example.com", "code": "000000" if code != "000000" else "111111",
                                            "password": "new-olive-2026"}).status_code == 400
    r2 = client.post("/auth/reset", json={"identifier": "amel@example.com", "code": code, "password": "new-olive-2026"})
    assert r2.status_code == 200 and r2.json()["token"]
    assert client.get("/auth/me", headers=H(old)).status_code == 401          # old sessions are closed
    assert client.post("/auth/login", json={"identifier": "amel@example.com", "password": "olive-2026"}).status_code == 401
    assert client.post("/auth/login", json={"identifier": "amel@example.com", "password": "new-olive-2026"}).status_code == 200
    # a code works once
    assert client.post("/auth/reset", json={"identifier": "amel@example.com", "code": code, "password": "again-2026x"}).status_code == 400


def test_reset_demo_code_only_locally(client, monkeypatch):
    from gaia import auth
    signup(client)
    assert "demo_code" not in client.post("/auth/forgot", json={"identifier": "amel@example.com"}).json()   # remote client
    local = auth.request_reset("amel@example.com", local_demo=True)
    assert local["channel"] == "demo" and local["demo_code"].isdigit()
    assert "demo_code" not in auth.request_reset("nobody@example.com", local_demo=True)                  # unknown account
    monkeypatch.setenv("GAIA_SMTP_HOST", "smtp.invalid")                                                  # email configured
    monkeypatch.setattr(auth, "_deliver", lambda *a: "email")
    assert "demo_code" not in auth.request_reset("amel@example.com", local_demo=True)


def test_reset_code_by_whatsapp(client, monkeypatch):
    import httpx
    from gaia import auth
    signup(client, identifier="98 123 456")
    sent = {}

    class R:
        status_code, text = 200, "{}"

    def fake_post(url, headers=None, json=None, timeout=None):
        sent.update(url=url, auth=headers["Authorization"], body=json)
        return R()

    monkeypatch.setenv("GAIA_WA_TOKEN", "test-token")
    monkeypatch.setenv("GAIA_WA_PHONE_ID", "1234567890")
    monkeypatch.setattr(httpx, "post", fake_post)
    r = auth.request_reset("98123456", local_demo=True)
    assert r["channel"] == "whatsapp" and "demo_code" not in r            # a real channel: never shown on the page
    assert sent["url"].endswith("/1234567890/messages") and sent["auth"] == "Bearer test-token"
    assert sent["body"]["to"] == "21698123456"                              # Tunisian number gets 216
    code = sent["body"]["template"]["components"][0]["parameters"][0]["text"]
    assert len(code) == 6 and code.isdigit()
    ok = client.post("/auth/reset", json={"identifier": "98123456", "code": code, "password": "via-whatsapp-1"})
    assert ok.status_code == 200


def test_lockout_after_repeated_failures(client):
    signup(client)
    for _ in range(5):
        assert client.post("/auth/login", json={"identifier": "amel@example.com", "password": "wrong-pass"}).status_code == 401
    r = client.post("/auth/login", json={"identifier": "amel@example.com", "password": "olive-2026"})
    assert r.status_code == 429
