# GAIA API (FastAPI)

The website works on its own in the browser. This backend exposes the same logic as an API, for a mobile app, a partner, or server-side checks.

```bash
cd backend
python -m venv .venv && . .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn gaia.main:app --reload                   # http://127.0.0.1:8000/docs
pytest -q                                        # needs node for the JS parity tests
```

| Endpoint | What it does | Status |
|---|---|---|
| `GET /health` | records loaded, whether a vision model is installed | implemented |
| `GET /knowledge/techniques?origin=tn\|jp\|x` | the 11 knowledge records (exported from `js/kb.js` by `tools/export_kb.js`) | implemented |
| `GET /parcel/profile?lat=&lon=` | GAIA LAND DNA from Open-Meteo (ERA5), Copernicus DEM, NASA POWER; soil from a local SoilGrids raster (`GAIA_SOIL_RASTER`), otherwise the regional reference `data/soil_tn.json` (confidence low) | implemented, needs internet; not tested from the build sandbox |
| `POST /analyze` | compatibility rules, verdicts feasible / adapt / insufficient / rejected | implemented, parity-tested against the browser engine |
| `POST /nexus/calculate` | FAO-56 water need → pumping energy → solar size → monthly quota; effective rain by USDA-SCS, or `pe_factor[12]` = share of each month's rain kept by the soil, learned in `ml/` (section 11, `ml/models/pluie_efficace_meta.json`) | implemented, parity-tested |
| `POST /nexus/guard` | groundwater guard: what the solar array could pump vs the crop need, monthly pumping cap (lower if a safe yield / permit is given), daily controller limits, water kept in the aquifer, solar energy freed | implemented, parity-tested against `js/guard-core.js` |
| `POST /business/payg` · `/business/coop` · `/business/adoption` | pay-as-you-go pump kit paid from diesel savings, cooperative shared pump (allowance = Σ quotas), four adoption tests | implemented, parity-tested |
| `POST /solar/simulate` | agrivoltaic simulation with pvlib (SPA, Erbs, isotropic) + 2-D row shading | implemented, labelled *simulation* |
| `GET /irrigation/forecast?lat=&lon=` | Soil reserve today and for the next 7 days from the LightGBM models trained in `ml/prevision_humidite_sol.ipynb` (2020 → yesterday, ECMWF IFS); recent soil state and weather forecast from the Open-Meteo forecast API (`models=ecmwf_ifs`) | implemented, needs internet; parity-tested against the notebook |
| `POST /irrigation/plan` | Optimal 8-day irrigation (model predictive control, `gaia/planner.py`): FAO-56 root-zone balance with the crop's Kc, started from the trained soil model's state and the learned effective rain; mode `water` (least water) or `solar` (least non-solar energy, the soil stores water pumped on sunny days); pumping hours from the hourly solar forecast; `plan_mm` simulates a schedule instead (what-if) | implemented, needs internet; Open-Meteo answers cached on disk for the day (`data/cache/`) |
| `POST /irrigation/replay` | Replays a past season day by day on the nearest site's real data (`ml/data`): quota method vs classic FAO-56 vs the planner (water, stress days, drainage, solar share) | implemented, offline |
| `POST /agent` | Smart irrigation agent: a language model reads the question, calls server-side tools (soil forecast, optimal plan, what-if simulation, solar forecast) and answers from their results in fr/ar/en/ja; each tool call is returned as a step. **Free**: Google Gemini or Groq free tier (`gaia/agent_llm.py`), key in `backend/.env` (copy `.env.example`). It remembers the conversation (the page sends the previous turns). Without a key it returns **503 no_free_key**; when the free quota is reached, **503 free_quota** (try again a minute later). With `ANTHROPIC_API_KEY` (paid), Claude answers | implemented; needs internet |
| `GET /farm/state` · `POST /farm/action` · `POST /farm/check` | The parcel's record (`gaia/farm_state.py`, files in `data/farm/`, not committed): irrigation calendar the farmer confirmed, irrigations reported (subtracted from the next plans), settings, morning check and alerts. The agent's action tools (`propose_save_plan`, `propose_log_irrigation`, `propose_update_settings`, `propose_monitoring`) only **propose**: `/farm/action` applies one after the farmer presses Confirm. `/farm/check` runs the morning check now; it also runs by itself every day at the chosen hour while the backend is running (`gaia/farm_monitor.py`, `GAIA_MONITOR=0` to turn off) | implemented |
| `POST /diagnose` | two-stage plant health (tree, then disease) with ONNX models from `models/gaia-vision/manifest.json` (or `GAIA_MODEL_DIR`); abstains when unsure | implemented; returns **503 model_not_loaded** until a validated model is installed (none is shipped yet) |
| `POST /assistant` | AI Lab wording by Claude (`claude-opus-5-5`, override with `GAIA_LLM_MODEL`), grounded only in the records and profile the page sends; says when the records do not cover the question | implemented; returns **503 no_api_key** until `ANTHROPIC_API_KEY` is set on the server |
| `POST /feedback` | Kaizen correction, appended to `data/feedback.jsonl` with `expert_status: pending` | implemented |

To make the website send Kaizen feedback here, set `feedbackEndpoint: 'http://127.0.0.1:8000/feedback'` in `js/gaia-core.js` (`CONFIG`).

When `js/kb.js` changes, run `node tools/export_kb.js` again.
