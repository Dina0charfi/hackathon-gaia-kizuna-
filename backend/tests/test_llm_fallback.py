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
