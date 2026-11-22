"""POST /plantnet with a mocked Pl@ntNet (no network, no real key)."""
import io
import httpx
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from gaia import plantnet
from gaia.main import app

client = TestClient(app)


def jpeg() -> bytes:
    b = io.BytesIO(); Image.new("RGB", (64, 64), (30, 120, 40)).save(b, "JPEG"); return b.getvalue()


def mock(monkeypatch, handler):
    monkeypatch.setenv("PLANTNET_API_KEY", "test-key")
    monkeypatch.setattr(plantnet, "_client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(handler)))


def post(**form):
    return client.post("/plantnet", files={"image": ("leaf.jpg", jpeg(), "image/jpeg")}, data=form)


def test_no_key(monkeypatch):
    from gaia import plantnet
    monkeypatch.delenv("PLANTNET_API_KEY", raising=False)
    monkeypatch.setattr(plantnet, "_dotenv_key", lambda: "")   # never use the private key: it would spend the daily quota
    r = post()
    assert r.status_code == 503 and r.json()["detail"]["status"] == "no_api_key"


def test_species_and_diseases(monkeypatch):
    def h(req: httpx.Request):
        assert req.url.params["api-key"] == "test-key"
        if req.url.path.endswith("/identify/all"):
            return httpx.Response(200, json={"results": [{"score": 0.91, "species": {
                "scientificNameWithoutAuthor": "Diospyros kaki", "commonNames": ["Kaki"],
                "family": {"scientificNameWithoutAuthor": "Ebenaceae"}}}], "remainingIdentificationRequests": 490})
        if req.url.path.endswith("/diseases/identify"):
            return httpx.Response(200, json={"results": [{"name": "Circular leaf spot", "score": 0.4}], "remainingIdentificationRequests": 489})
        return httpx.Response(500)
    mock(monkeypatch, h)
    j = post().json()
    assert j["species"][0]["scientific_name"] == "Diospyros kaki"
    assert j["diseases"][0]["label"] == "Circular leaf spot" and j["disease_status"] == "ok"
    assert j["attribution"] == "Powered by Pl@ntNet" and j["remaining_requests"] == 489


def test_not_a_plant_skips_diseases(monkeypatch):
    calls = []
    def h(req):
        calls.append(req.url.path); return httpx.Response(404, json={"message": "Species not found"})
    mock(monkeypatch, h)
    j = post().json()
    assert j["not_a_plant"] and j["species"] == [] and len(calls) == 1


def test_disease_route_failure_keeps_species(monkeypatch):
    def h(req):
        if req.url.path.endswith("/identify/all"):
            return httpx.Response(200, json={"results": [{"score": 0.5, "species": {"scientificNameWithoutAuthor": "X y"}}]})
        return httpx.Response(500)
    mock(monkeypatch, h)
    j = post().json()
    assert j["species"] and j["disease_status"] == "unavailable"


@pytest.mark.parametrize("code,status", [(401, 502), (429, 429), (500, 502)])
def test_upstream_errors(monkeypatch, code, status):
    mock(monkeypatch, lambda req: httpx.Response(code, json={}))
    assert post().status_code == status


def test_rejects_non_image(monkeypatch):
    mock(monkeypatch, lambda req: httpx.Response(200, json={}))
    r = client.post("/plantnet", files={"image": ("x.txt", b"hello", "text/plain")})
    assert r.status_code == 422
