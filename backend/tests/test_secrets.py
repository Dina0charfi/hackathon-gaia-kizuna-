"""The public .env.example must never hold a real key, password or address."""
import re
from pathlib import Path

EXAMPLE = Path(__file__).resolve().parent.parent / ".env.example"


def test_example_has_only_placeholders():
    bad = []
    for n, line in enumerate(EXAMPLE.read_text(encoding="utf-8-sig").splitlines(), 1):
        s = line.strip()
        if re.search(r"(gsk_|hf_|sk-ant-)[A-Za-z0-9_-]{10,}", s):
            bad.append(f"line {n}: a real API key")
        k, _, v = s.partition("=")
        if not s.startswith("#") and re.search(r"KEY|TOKEN|PASSWORD|SMTP", k) and v and not v.startswith("colle-ta-cle"):
            bad.append(f"line {n}: an active private value")     # real values go in backend/.env
        if re.search(r"GAIA_SMTP_PASSWORD=(?!mot-de-passe-d-application)\S", s):
            bad.append(f"line {n}: a mail password")
    assert not bad, bad     # the message never shows the value itself
