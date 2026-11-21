# GAIA AgriNet: the Solar Brain's neural network

A small neural network that predicts, for **wheat** and **potato**, how much yield a crop keeps under solar panels in Tunisia, and its full-sun potential yield. It is trained on the WOFOST crop model and runs in the browser (`js/agv-net.js`, 162 weights, no library).

## Why a crop model as teacher

There is no public dataset of agrivoltaic harvests in Tunisia. WOFOST (Wageningen University, used for the EU MARS yield forecasts) simulates crop growth day by day from weather. We use it as a teacher: thousands of simulated seasons become the training set, and the network learns the response in a form fast enough for the browser and the genetic optimiser.

## Pipeline

| Step | Script | What |
|---|---|---|
| 1 | `01_simulate.py` | WOFOST 7.2 (PCSE, potential production) on NASA POWER daily weather, 14 Tunisian farming sites (Bizerte skipped: one NASA POWER rain value is outside PCSE's allowed range), 2001–2022, sowing date shifted at random by up to ±20 days, 8 light levels under panels (L = 1.0 … 0.3: radiation × L, Tmax − 4 °C × (1 − L)). Writes `data/wofost_tunisia.csv`. |
| 2 | `02_train.py` | Multilayer perceptron 7 → 16 → 2 (tanh, weight decay 1e-3, 162 parameters), Adam, numpy only. Leave-one-site-out validation: trained on 12 sites, tested on the 13th, for every site. Baseline: the calibrated formula of `js/agv-ai-core.js`. Writes `js/agv-net.js` and `models/agv-net/metrics.json`. |

**Inputs:** crop (one-hot), light share L, season radiation (GJ/m²), mean Tmax and Tmin (°C), sowing shift.
**Outputs:** relative yield under the panels, and full-sun potential yield (t/ha). In the browser the relative yield is divided by the network's own full-sun answer, so full sun is exactly 100 %.

## Results (leave-one-site-out, 13 sites, 4,576 rows)

| | Network | Baseline |
|---|---|---|
| Wheat, relative yield under panels | MAE 2.7 pts, R² 0.98 | formula: 5.6 pts, R² 0.93 |
| Potato, relative yield under panels | MAE 1.5 pts, R² 0.98 | formula: 2.5 pts, R² 0.95 |
| Wheat, full-sun yield | MAE 0.58 t/ha, R² 0.46 | mean of other sites: 0.81 t/ha |
| Potato, full-sun yield | MAE 0.83 t/ha, R² 0.53 | mean of other sites: 1.31 t/ha |

Choosing the network: a first version (8 → 32 → 32 → 2, with latitude) memorised the sites and failed on new ones (full-sun yield worse than the mean). Removing latitude and using one small regularised layer fixed it.

## Run

```
python -m pip install pcse numpy
python ml/agv-net/01_simulate.py      # internet once (NASA POWER), ~20–30 min
python ml/agv-net/02_train.py         # ~1 min
node backend/tests/agv_ai_test.js
```

## Limits

- Learned from a crop model, not yet from real harvests. The next step is fine-tuning on a Tunisian pilot plot (light sensors, soil moisture, weighed harvests).
- WOFOST wheat varieties are European bread wheats, not Tunisian durum wheat.
- Potential production: water and nutrients are not limiting.
- In the browser, the season inputs are built from the parcel's monthly climate over the crop's months, while training used daily weather over the exact season, so expect a small extra error.
- Tomato, pepper, lettuce, strawberry and alfalfa have no WOFOST parameters and keep the formula.
