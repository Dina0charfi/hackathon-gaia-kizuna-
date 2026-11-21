"""GAIA REASONING — compatibility engine (M1). Python port of js/engine-core.js.

Verdicts:
  feasible      every mandatory condition is met
  adapt         a mandatory condition fails, and the record defines an adaptation for it
  insufficient  no mandatory condition fails, but at least one could not be evaluated
  rejected      a mandatory condition fails with no adaptation
The score (weighted share of secondary conditions met) is only returned when
every secondary condition could be evaluated.
"""
from __future__ import annotations

from typing import Any

DIMS = ["climate", "terrain", "water", "materials", "org", "reg"]
ORDER = {"feasible": 0, "adapt": 1, "insufficient": 2, "rejected": 3}


def value(profile: dict[str, Any], path: str) -> Any:
    """Read a value from a flat profile {"climate.rain_mm": 180, ...} or a nested GAIA LAND DNA."""
    if path in profile:
        v = profile[path]
        return v.get("value") if isinstance(v, dict) and v.get("status", "ok") == "ok" else (None if isinstance(v, dict) else v)
    node: Any = profile
    for part in path.split("."):
        if not isinstance(node, dict):
            return None
        node = node.get(part)
    if isinstance(node, dict):
        return node.get("value") if node.get("status") == "ok" else None
    return node


def test(cond: dict[str, Any], v: Any) -> str:
    if v is None:
        return "unknown"
    op, target = cond["op"], cond["value"]
    if op == "max":
        return "pass" if v <= target else "fail"
    if op == "min":
        return "pass" if v >= target else "fail"
    if op == "between":
        return "pass" if target[0] <= v <= target[1] else "fail"
    if op == "in":
        return "pass" if v in target else "fail"
    return "unknown"


def evaluate(record: dict[str, Any], profile: dict[str, Any]) -> dict[str, Any]:
    checks = []
    for c in record["conditions"]:
        v = value(profile, c["field"])
        checks.append({"field": c["field"], "dim": c["dim"], "hard": bool(c.get("hard")), "value": v,
                       "result": test(c, v), "why": c.get("why"), "provisional": bool(c.get("provisional"))})

    hard_fails = [x for x in checks if x["hard"] and x["result"] == "fail"]
    unknown = [x for x in checks if x["result"] == "unknown"]
    soft = [x for x in checks if not x["hard"]]

    verdict, adaptation = "feasible", None
    if hard_fails:
        failed = {x["field"] for x in hard_fails}
        for a in record.get("adaptations", []):
            if not failed.issubset(set(a["when"])):
                continue
            req = a.get("requires")
            if req and test(req, value(profile, req["field"])) != "pass":
                continue
            adaptation = a
            break
        verdict = "adapt" if adaptation else "rejected"
    elif any(x["hard"] and x["result"] == "unknown" for x in checks):
        verdict = "insufficient"
    elif checks and len(unknown) == len(checks):
        verdict = "insufficient"  # nothing about this parcel could be checked: no verdict without evidence

    score = None
    if verdict in ("feasible", "adapt") and soft and all(x["result"] != "unknown" for x in soft):
        w = [(r.get("weight", 1)) for r in (c for c in record["conditions"] if not c.get("hard"))]
        met = [wi for wi, x in zip(w, soft) if x["result"] == "pass"]
        score = sum(met) / sum(w) if sum(w) else None

    dims = {}
    for d in DIMS:
        cs = [x for x in checks if x["dim"] == d]
        if not cs:
            status = "info" if d in ("materials", "org", "reg") else "none"
        elif any(x["result"] == "fail" and x["hard"] for x in cs):
            status = "fail"
        elif any(x["result"] == "unknown" for x in cs):
            status = "unknown"
        elif any(x["result"] == "fail" for x in cs):
            status = "partial"
        else:
            status = "pass"
        dims[d] = status

    return {
        "technique": record["id"], "version": record.get("version"), "origin": record["origin"], "name": record["name"],
        "verdict": verdict, "score": score, "adaptation": adaptation["text"] if adaptation else None,
        "checks": checks, "missing": [x["field"] for x in unknown], "dims": dims,
        "provisional": any(x["provisional"] for x in checks),
        "review_status": record.get("review", {}).get("status", "draft"),
        "actions": record.get("actions", []), "sources": record.get("sources", []),
    }


def evaluate_all(records: list[dict[str, Any]], profile: dict[str, Any]) -> list[dict[str, Any]]:
    res = [evaluate(r, profile) for r in records]
    res.sort(key=lambda r: (ORDER[r["verdict"]], -(r["score"] if r["score"] is not None else -1)))
    return res
