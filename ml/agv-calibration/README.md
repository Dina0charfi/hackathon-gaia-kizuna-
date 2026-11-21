# GAIA Solar Brain: crop shade calibration

The Solar Brain page (`agrivoltaic.html`, `js/agv-ai-core.js`) predicts how much yield a crop keeps under solar panels with

```
fL = min(1, L / Ls) ^ g        L = share of full sun reaching the crop
```

`Ls` (light above which more light adds no yield) and `g` (curvature) were literature guesses. This folder replaces them, for the crops a real crop model covers, with values fitted on **WOFOST**.

## Method

| Step | What |
|---|---|
| Crop model | WOFOST 7.2, potential production (water and nutrients unlimited, so only light and temperature act), through [PCSE](https://pcse.readthedocs.io) |
| Weather | NASA POWER daily data, free and without a key, 2001–2023 |
| Sites | Jendouba, Tunis, Kairouan, Sidi Bouzid (north to centre of Tunisia) |
| Shade | radiation × L and daily maximum temperature − 4 °C × (1 − L), the same assumption as the browser model; L = 1.0 … 0.3 |
| Output | `yrel(L)` = mean yield under shade / mean yield in full sun, then least-squares fit of `Ls` and `g` |

Result: `models/agv-calibration/calibration.json` (fitted values, fit error, the raw curve, seasons used and the literature values replaced).

## Run

```
python -m pip install pcse
python ml/agv-calibration/calibrate.py
```

Internet is needed once to download the NASA POWER weather; a full run takes a few minutes.

## Limits

- WOFOST has parameters for **wheat** and **potato** among GAIA's crops. Tomato, pepper, lettuce, strawberry and alfalfa keep their literature values until field trial data exist.
- The WOFOST wheat varieties are bread-wheat varieties calibrated in Europe; Tunisian durum wheat may respond differently.
- Potential production ignores water stress. Panels also save water (see `BETA` in `agv-ai-core.js`), which this calibration does not count, so it is a conservative view for dry years.
- The next step is calibration on a Tunisian agrivoltaic trial plot (light sensors, soil moisture, harvest weights).
