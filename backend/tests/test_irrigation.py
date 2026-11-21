"""The backend must compute the 7-day forecast exactly like the training notebook."""
from pathlib import Path

import pandas as pd
import pytest

from gaia import irrigation

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="module")
def meta():
    if not irrigation.available():
        pytest.skip("irrigation models not trained (run ml/prevision_humidite_sol.ipynb)")
    return irrigation.load()["meta"]


def test_same_prediction_as_notebook(meta):
    ex = meta["exemple"]
    csv = ROOT / "ml" / "data" / f"{ex['site']}.csv"
    if not csv.exists():
        pytest.skip("training data not downloaded")
    site = next(s for s in meta["sites"] if s["id"] == ex["site"])
    df = pd.read_csv(csv, parse_dates=["date"]).assign(lat=site["lat"], lon=site["lon"])
    feats = irrigation.build_features(df)
    got = irrigation.predict_row(feats[feats.date == ex["date"]])
    for h, want in ex["predictions"].items():
        assert got[int(h)] == pytest.approx(want, abs=1e-9)


def test_nearest_site(meta):
    assert irrigation.nearest_site(33.71, 8.96)["id"] == "kebili"
