"""When a model is busy, too small or withdrawn, the next model of the same provider answers."""
import pytest

from gaia import agent, assistant, leaf
from tests.test_api import _Resp, _no_llm


class Http:
    def __init__(self, codes, texts=("ok",)):
        self.codes, self.models, self.texts, self.payloads = codes, [], texts, []

    def post(self, url, json=None, headers=None, timeout=None):
        self.models.append(json["model"])
        self.payloads.append(json)
        text = self.texts[min(len(self.models), len(self.texts)) - 1]
        return _Resp(self.codes[min(len(self.models), len(self.codes)) - 1], {"choices": [{"message": {"content": text}}]})


@pytest.fixture()
def groq(monkeypatch, tmp_path):
    a = _no_llm(monkeypatch, tmp_path)
    for k in ("GAIA_LLM_FALLBACK_MODELS", "GAIA_LLM_LEAF_MODEL"):
        monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("GAIA_LLM_PROVIDER", "groq")
    monkeypatch.setenv("GAIA_LLM_API_KEY", "gsk_x")
    monkeypatch.setenv("GAIA_LLM_OPENAI_MODEL", "openai/gpt-oss-120b")
    return a


ASKS = [lambda h: assistant.answer({"question": "x"}, http=h), lambda h: leaf.explain({}, http=h),
        lambda h: agent.step([{"role": "user", "content": "x"}], [], http=h)]


@pytest.mark.parametrize("ask", ASKS)
@pytest.mark.parametrize("code", [429, 413, 404, 400])
def test_next_model_answers(groq, ask, code):
    h = Http([code, 200])
    out = ask(h)
    assert h.models == ["openai/gpt-oss-120b", "openai/gpt-oss-20b"] and out["model"] == "openai/gpt-oss-20b"


@pytest.mark.parametrize("ask", ASKS)
def test_stops_after_three_models_and_not_on_a_bad_key(groq, ask):
    h = Http([429])
    with pytest.raises(assistant.AssistantUnavailable):
        ask(h)
    assert len(h.models) == 3
    h = Http([401])
    with pytest.raises(assistant.AssistantUnavailable):
        ask(h)
    assert len(h.models) == 1


def test_list_can_be_changed_or_turned_off(groq, monkeypatch):
    monkeypatch.setenv("GAIA_LLM_FALLBACK_MODELS", "m1, m2")
    h = Http([429, 429, 200])
    assert assistant.answer({"question": "x"}, http=h)["model"] == "m2"
    monkeypatch.setenv("GAIA_LLM_FALLBACK_MODELS", "none")
    h = Http([429, 200])
    with pytest.raises(assistant.AssistantUnavailable):
        assistant.answer({"question": "x"}, http=h)
    assert len(h.models) == 1


@pytest.mark.parametrize("ask", ASKS)
def test_an_empty_answer_goes_to_the_next_model(groq, ask):
    h = Http([200], ["", "ok"])
    assert ask(h)["text"] == "ok" and len(h.models) == 2
    assert h.payloads[0]["reasoning_effort"] == "low"


def test_waits_once_when_every_model_is_busy(groq, monkeypatch):
    class Busy(Http):
        def post(self, *a, **k):
            r = super().post(*a, **k)
            r.headers = {"retry-after": "4"}
            return r

    waits = []
    monkeypatch.setattr(assistant.time, "sleep", waits.append)
    h = Busy([429, 429, 429, 200])
    assert assistant.answer({"question": "x"}, http=h)["text"] == "ok" and waits == [4.5] and len(h.models) == 4
    h = Busy([429])
    monkeypatch.setattr(assistant, "MAX_WAIT", 1.0)
    with pytest.raises(assistant.AssistantUnavailable):
        assistant.answer({"question": "x"}, http=h)
    assert len(h.models) == 3 and len(waits) == 1


def test_prompts_fit_the_free_limit():
    from gaia import main
    body = {"question": "Que planter ?", "records": main.KB["records"], "profile": {"rain": 269}}
    assert len(assistant.build_prompt(body)) > 13000
    p = assistant.build_prompt(assistant.fit_body(body, 13000))
    assert len(p) <= 13000 and all(r["id"] in p for r in main.KB["records"]) and "269" in p
    import json
    slim = json.loads(agent._slim_text(json.dumps({"kwh": 1, "months": [1] * 12, "next": list(range(14)), "x": None})))
    assert slim == {"kwh": 1, "next": list(range(8))}
