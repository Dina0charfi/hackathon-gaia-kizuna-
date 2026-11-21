"""Pl@ntNet bridge: species name + possible disease for photos GAIA's own models cannot handle.

Used ONLY when the user explicitly agrees in the page (consent button). The API key stays on the server
(PLANTNET_API_KEY); the browser never sees it. Results are passed through as "external, not validated by a
GAIA expert": GAIA adds no treatment advice to them.

Pl@ntNet API: https://my.plantnet.org/doc  (free plan: 500 identifications / day; "Powered by Pl@ntNet" required).
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

import httpx

API = os.environ.get("PLANTNET_API_URL", "https://my-api.plantnet.org/v2")
ATTRIBUTION = "Powered by Pl@ntNet"
NOTICE = ("External result from Pl@ntNet. It is not validated by a GAIA expert and GAIA gives no treatment "
          "advice for it. Ask a technician before acting.")

# httpx logs full URLs at INFO level, and the Pl@ntNet key travels in the query string: never log it.
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)


class PlantnetError(Exception):
    def __init__(self, http_status: int, status: str, message: str):
        super().__init__(message)
        self.http_status = http_status
        self.detail = {"status": status, "message": message}


def _dotenv_key() -> str:
    """Fallback: read PLANTNET_API_KEY from backend/.env (a git-ignored file the user creates)."""
    f = Path(__file__).resolve().parent.parent / ".env"
    try:
        for line in f.read_text(encoding="utf-8-sig").splitlines():
            k, _, v = line.partition("=")
            if k.strip() == "PLANTNET_API_KEY":
                return v.strip().strip("\"'")
    except OSError:
        pass
    return ""


def api_key() -> str:
    return os.environ.get("PLANTNET_API_KEY", "").strip() or _dotenv_key()


def _client() -> httpx.AsyncClient:  # replaced in tests
    return httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=10.0))


def _pct(x: Any) -> float | None:
    return round(float(x), 4) if isinstance(x, (int, float)) else None


def _species(results: list[dict]) -> list[dict]:
    out = []
    for r in results:
        sp = r.get("species") or {}
        out.append({
            "scientific_name": sp.get("scientificNameWithoutAuthor") or sp.get("scientificName"),
            "common_names": (sp.get("commonNames") or [])[:3],
            "family": (sp.get("family") or {}).get("scientificNameWithoutAuthor"),
            "score": _pct(r.get("score")),
        })
    return [s for s in out if s["scientific_name"]]


def _diseases(results: list[dict]) -> list[dict]:
    """The disease route's item fields are not documented in the pages we could read, so map defensively."""
    out = []
    for r in results:
        label = r.get("name") or r.get("label") or r.get("id") or (r.get("disease") or {}).get("name")
        if not label:
            continue
        out.append({"label": str(label), "score": _pct(r.get("score")),
                    "description": r.get("description") if isinstance(r.get("description"), str) else None})
    return out


async def _post(client: httpx.AsyncClient, path: str, image: bytes, organ: str, params: dict) -> httpx.Response:
    return await client.post(f"{API}{path}", params={"api-key": api_key(), **params},
                             files=[("images", ("leaf.jpg", image, "image/jpeg"))], data={"organs": organ})


async def identify(image: bytes, organ: str = "leaf", lang: str = "fr", diseases: bool = True) -> dict:
    if not api_key():
        raise PlantnetError(503, "no_api_key", "Pl@ntNet is not configured on this server (set PLANTNET_API_KEY).")
    async with _client() as c:
        try:
            r = await _post(c, "/identify/all", image, organ, {"lang": lang, "nb-results": 3})
            if r.status_code == 400 and lang != "en":      # language not offered by Pl@ntNet: retry in English
                r = await _post(c, "/identify/all", image, organ, {"lang": "en", "nb-results": 3})
        except httpx.HTTPError as e:
            raise PlantnetError(502, "upstream_unreachable", "Pl@ntNet could not be reached.") from e
        if r.status_code in (401, 403):
            raise PlantnetError(502, "bad_api_key", "Pl@ntNet refused the server's API key.")
        if r.status_code == 429:
            raise PlantnetError(429, "quota_exceeded", "Pl@ntNet daily quota reached. Try again tomorrow.")
        species: list[dict] = []
        not_a_plant = False
        remaining = None
        if r.status_code == 404:                           # "Species not found": not a plant, or nothing predicted
            not_a_plant = True
        elif r.status_code != 200:
            raise PlantnetError(502, "upstream_error", f"Pl@ntNet answered HTTP {r.status_code}.")
        else:
            j = r.json()
            species = _species(j.get("results") or [])
            remaining = j.get("remainingIdentificationRequests")
        out: dict[str, Any] = {"source": "Pl@ntNet", "attribution": ATTRIBUTION, "notice": NOTICE,
                               "species": species, "not_a_plant": not_a_plant, "diseases": None,
                               "disease_status": "not_requested", "remaining_requests": remaining}
        if diseases and not not_a_plant:
            try:
                d = await _post(c, "/diseases/identify", image, organ, {"lang": lang, "nb-results": 3})
                if d.status_code == 200:
                    dj = d.json()
                    out["diseases"] = _diseases(dj.get("results") or [])
                    out["disease_status"] = "ok"
                    out["remaining_requests"] = dj.get("remainingIdentificationRequests", remaining)
                elif d.status_code == 404:
                    out["diseases"], out["disease_status"] = [], "ok"
                else:
                    out["disease_status"] = "unavailable"   # species still returned
            except httpx.HTTPError:
                out["disease_status"] = "unavailable"
        return out
