"""Irrigation agent loop with a fake Claude client: tools run on the server and every call is reported as a step."""
import asyncio
import json
from types import SimpleNamespace as NS

from gaia import agent


class FakeMessages:
    def __init__(self, script):
        self.script, self.calls = list(script), []

    async def create(self, **kw):
        self.calls.append(kw | {"messages": list(kw["messages"])})       # snapshot: the agent keeps appending
        return self.script.pop(0)


def msg(stop, *blocks):
    return NS(stop_reason=stop, content=list(blocks), model="fake")


def test_agent_runs_tools_and_reports_steps(monkeypatch):
    async def fake_tool(name, inp, parcel):
        assert parcel["lat"] == 34.0
        return {"totals": {"net_mm": 12.0, "m3": 266.7, "stress_days": 0, "solar_share": 0.8}} if name != "get_soil_forecast" else \
            {"days": [{"reserve": 0.5}, {"reserve": 0.3}]}
    monkeypatch.setattr(agent, "run_tool", fake_tool)
    fake = FakeMessages([
        msg("tool_use", NS(type="tool_use", id="t1", name="get_soil_forecast", input={}),
            NS(type="tool_use", id="t2", name="optimize_irrigation_plan", input={"mode": "solar"})),
        msg("end_turn", NS(type="text", text="Irriguez 12 mm jeudi entre 11 h et 13 h.")),
    ])
    out = asyncio.run(agent.answer({"question": "Quand irriguer ?", "lang": "fr", "parcel": {"lat": 34.0, "lon": 10.0}},
                                   client=NS(beta=NS(messages=fake))))
    assert out["status"] == "ok" and "12 mm" in out["text"]
    assert [s["tool"] for s in out["steps"]] == ["get_soil_forecast", "optimize_irrigation_plan"]
    assert "solaire 80 %" in out["steps"][1]["summary"]
    # both tool results go back in ONE user message
    second = fake.calls[1]["messages"]
    assert second[-1]["role"] == "user" and len(second[-1]["content"]) == 2


def test_tool_errors_are_returned_to_the_model(monkeypatch):
    async def boom(name, inp, parcel):
        raise ValueError("Open-Meteo down")
    monkeypatch.setattr(agent, "run_tool", boom)
    fake = FakeMessages([
        msg("tool_use", NS(type="tool_use", id="t1", name="get_solar_forecast", input={})),
        msg("end_turn", NS(type="text", text="Prévision indisponible.")),
    ])
    out = asyncio.run(agent.answer({"question": "Soleil ?", "parcel": {"lat": 34.0, "lon": 10.0}}, client=NS(beta=NS(messages=fake))))
    res = fake.calls[1]["messages"][-1]["content"][0]
    assert res["is_error"] is True and "Open-Meteo down" in res["content"]
    assert out["steps"][0]["summary"].startswith("ValueError")


def test_free_llm_engine_calls_tools_then_answers(monkeypatch):
    from gaia import agent_llm
    monkeypatch.setenv("GAIA_LLM_API_KEY", "test-key")
    monkeypatch.setenv("GAIA_LLM_PROVIDER", "groq")

    async def fake_tool(name, inp, parcel):
        return {"totals": {"net_mm": 6.0, "m3": 66.7, "stress_days": 0, "solar_share": 0.9}}
    monkeypatch.setattr(agent, "run_tool", fake_tool)
    sent = []
    replies = [
        (200, {"choices": [{"message": {"content": None, "tool_calls": [
            {"id": "c1", "type": "function", "function": {"name": "optimize_irrigation_plan", "arguments": "{\"mode\": \"solar\"}"}}]}}]}),
        (200, {"choices": [{"message": {"content": "Irriguez 6 mm jeudi entre 11 h et 13 h."}}]}),
    ]

    async def fake_post(url, headers, payload):
        sent.append((url, headers["Authorization"], [m["role"] for m in payload["messages"]]))
        return replies.pop(0)
    out = asyncio.run(agent_llm.answer({"question": "Quand ?", "lang": "fr", "parcel": {"lat": 34.0, "lon": 10.0}}, post=fake_post))
    assert out["engine"] == "free_llm" and out["provider"] == "Groq" and "6 mm" in out["text"]
    assert sent[0][0] == "https://api.groq.com/openai/v1/chat/completions" and sent[0][1] == "Bearer test-key"
    assert sent[1][2] == ["system", "user", "assistant", "tool"]
    assert out["steps"][0]["tool"] == "optimize_irrigation_plan"
    assert "additionalProperties" not in json.dumps(agent_llm.TOOLS)


def test_without_any_key_the_page_is_told_to_add_the_free_key(monkeypatch):
    for k in ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_PROFILE", "GAIA_LLM_API_KEY"):
        monkeypatch.delenv(k, raising=False)
    try:
        asyncio.run(agent.answer({"question": "x", "parcel": {"lat": 34.0, "lon": 10.0}}))
    except agent.AgentUnavailable as e:
        assert e.detail["status"] == "no_free_key"
    else:
        raise AssertionError("expected AgentUnavailable")


def test_conversation_memory_is_sent_to_the_model():
    msgs = agent.first_messages({"question": "Et jeudi ?", "lang": "fr", "parcel": {"lat": 34.0, "lon": 10.0},
                                 "history": [{"role": "assistant", "content": "orphan"},
                                             {"role": "user", "content": "Quand irriguer ?"},
                                             {"role": "assistant", "content": "Mardi, 6 mm."}]})
    assert [m["role"] for m in msgs] == ["user", "assistant", "user"]
    assert msgs[0]["content"] == "Quand irriguer ?" and "Et jeudi ?" in msgs[-1]["content"]
