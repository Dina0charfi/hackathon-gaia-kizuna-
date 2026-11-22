"""Plant health explanation: providers, prompt rules, no model."""
from fastapi.testclient import TestClient

from gaia import assistant, leaf
from gaia.main import app
from tests.test_api import _Http, _no_llm

client = TestClient(app)
EV = {"certainty": "good", "gaia_plant": "olive", "gaia_result": "peacock spot"}


def test_without_model_is_503(monkeypatch, tmp_path):
    _no_llm(monkeypatch, tmp_path)
    r = client.post("/leaf/explain", json={"evidence": EV})
    assert r.status_code == 503 and r.json()["detail"]["status"] == "no_api_key"


def test_free_provider_gets_evidence_and_safety_rules(monkeypatch, tmp_path):
    _no_llm(monkeypatch, tmp_path)
    (tmp_path / "none.env").write_text("GAIA_LLM_PROVIDER=groq\nGAIA_LLM_API_KEY=gsk_test\n", encoding="utf-8")
    http = _Http(text="<think>x</think>## WHAT\nOeil de paon")
    out = leaf.explain(EV, "ar", http=http)
    assert out["text"] == "## WHAT\nOeil de paon" and out["provider"] == "groq"
    sys_msg, user = (m["content"] for m in http.calls[0]["json"]["messages"])
    assert "peacock spot" in user and "LANG: Arabic" in user
    assert "pesticide" in sys_msg and "CRDA" in sys_msg


def test_falls_back_to_ollama_and_reports_errors(monkeypatch, tmp_path):
    _no_llm(monkeypatch, tmp_path)
    monkeypatch.setattr(assistant, "ollama_model", lambda: "qwen2.5:3b")
    assert leaf.explain(EV, http=_Http(text="ok"))["provider"] == "ollama-local"
    try:
        leaf.explain(EV, http=_Http(status=500))
        raise AssertionError("should fail")
    except assistant.AssistantUnavailable as e:
        assert e.detail["status"] == "api_error"
    assert client.post("/leaf/explain", json={"evidence": EV, "lang": "xx"}).status_code == 422


class _List:
    status_code = 200

    @staticmethod
    def json():
        return [{"name": "VITEVI", "label": "Daktulosphaira vitifoliae - Phylloxéra de la vigne"}]


def test_anomaly_codes_get_their_real_names(monkeypatch):
    class H:
        @staticmethod
        def get(url, params=None, timeout=None):
            return _List()

    monkeypatch.setattr(leaf, "_names", {})
    monkeypatch.setattr(leaf.P, "api_key", lambda: "k")
    ev = {"possible_anomalies": [{"code": "VITEVI", "confidence": "3 %"}, {"code": "ZZZZZZ", "confidence": "1 %"}]}
    out = leaf.name_anomalies(ev, "fr", H)
    assert out[0]["name"] == "Phylloxéra de la vigne" and out[0]["latin"] == "Daktulosphaira vitifoliae"
    assert out[1]["name"] == "ZZZZZZ" and out[1]["known"] is False
    assert "Phylloxéra de la vigne" in leaf.build_prompt(ev, "fr")
    assert leaf.name_anomalies({"possible_anomalies": []}, "fr", H) == []


def test_sheets_match_the_right_kind():
    for label, word in (("Oligonychus ilicis - Southern red mite", "mites"), ("Procontarinia matteiana - Mango gall midge", "fly"),
                        ("Daktulosphaira vitifoliae - Grapevine leaf louse", "galls"), ("Aceria oleae - Olive bud mite", "microscopic"),
                        ("Bemisia tabaci - Tobacco whitefly", "flying"), ("Tomato mosaic virus", "virus")):
        assert word in str(leaf.sheet(label)), label
    assert leaf.sheet("Unknownus thingus") is None
    assert leaf.sheet("Unknownus thingus", ["Arachnida"])["what"].startswith("tiny sap-sucking mites")
