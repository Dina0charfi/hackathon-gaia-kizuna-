# Bundled Tunisia grids (soil 5 km, climate normals)

The Land DNA needs soil and climate values even when the live APIs are down or
rate-limited (SoilGrids REST is paused by ISRIC; Open-Meteo returns HTTP 429 on busy
shared networks). These two small tables are real open data sampled once and shipped
with the site. Every value they give is labelled with its source and confidence.

| File | What | Size |
|---|---|---|
| `soil_grid_tn.bin` | SoilGrids 2.0 clay %, sand %, organic carbon, 0–30 cm, mean of each 0.05° (≈ 5 km) cell, Tunisia bbox 30.2–37.6 N, 7.5–11.7 E (148 × 84 cells) | 37 KB |
| `climate_tn.bin` | NASA POWER 2001–2025 monthly climatology on its 0.5° × 0.625° grid (16 × 7 points): rain, FAO-56 ET0, mean daily Tmax and Tmin per month | 5 KB |

`python3 tools/tn-grids/pack.py` turns them into `js/soil-grid-tn.js`, `js/climate-tn.js`,
`backend/data/soil_grid_tn.json` and `backend/data/climate_tn.json`.

## How the data was sampled (2026-11-21)

Both were fetched in a browser (CORS-free on the provider's own origin) with the
scripts below; the bytes were checked with the hash printed at the end.

### Soil — ISRIC WCS (maps.isric.org)

For each of `clay`, `sand`, `soc` and each depth `0-5cm`, `5-15cm`, `15-30cm`, one
`GetCoverage` of `<prop>_<depth>_mean` over the bbox, resampled to 336 × 592 pixels
(4 × 4 samples per 0.05° cell, ≈ 1.25 km apart), EPSG:4326, GeoTIFF:

```
https://maps.isric.org/mapserv?map=/map/<prop>.map&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage
  &COVERAGEID=<prop>_<depth>_mean&FORMAT=image/tiff
  &SUBSET=long(7.5,11.7)&SUBSET=lat(30.2,37.6)
  &SUBSETTINGCRS=http://www.opengis.net/def/crs/EPSG/0/4326
  &OUTPUTCRS=http://www.opengis.net/def/crs/EPSG/0/4326&SCALESIZE=long(336),lat(592)
```

Per pixel: depth-weighted 0–30 cm mean (5, 10, 15 cm weights); pixels where clay and
sand are both 0 are sea/no data. Per cell: mean of the valid pixels (at least 4 of 16),
clay and sand in % (SoilGrids g/kg ÷ 10), SOC in g/kg stored × 5. Three planes of
12 432 bytes, rows south → north; 255 = no data.

### Climate — NASA POWER climatology (power.larc.nasa.gov)

One regional request per parameter (`PRECTOTCORR, T2M, T2M_RANGE, RH2M, WS2M,
ALLSKY_SFC_SW_DWN, TOA_SW_DWN`, community `RE`) over lat 30–37.5, lon 7.5–11.5:

```
https://power.larc.nasa.gov/api/temporal/climatology/regional?latitude-min=30&latitude-max=37.5
  &longitude-min=7.5&longitude-max=11.5&parameters=<P>&community=RE&format=JSON
```

Radiation comes on a 1° grid: each meteorology point uses the nearest radiation point.
Each point goes through `GAIA_CLIMATE.fromPower()` (js/climate-core.js, FAO-56
Penman–Monteith on monthly means, POWER elevation) and is stored as 48 bytes:
12 × rain mm, 12 × ET0 mm ÷ 2, 12 × (Tmax + 20) × 4, 12 × (Tmin + 20) × 4.

## Limits (said on the page too)

- Soil: a 5 km mean of a 250 m model is not a measurement of the plot; SoilGrids is
  weakest in the Saharan south. Organic carbon is always shown with confidence "low".
- Climate: MERRA-2 cells are ≈ 50 km, so rainfall in the hilly north (Kroumirie, Mogods)
  is underestimated; the table is the last fallback and is shown with confidence "low".
