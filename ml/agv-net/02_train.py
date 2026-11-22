"""
GAIA AgriNet, step 2: train a small neural network on the WOFOST dataset and
export it so the browser can run it (no library, no server, no key).

Network: multilayer perceptron, 8 inputs -> 32 tanh -> 32 tanh -> 2 outputs
  inputs : crop (one-hot wheat, potato), L (light share under panels), latitude,
           season radiation (GJ/m²), mean Tmax, mean Tmin (°C), sowing shift (days / 20)
  outputs: yrel  = yield under panels / yield in full sun
           yfull = full-sun potential yield (t/ha)
Training: Adam, mean squared error on standardised targets, numpy only.

Validation is spatial: whole sites are held out (the network never sees their
weather), so the score says how well it works on a farm it has not met.
Baseline for yrel: the calibrated formula min(1, L/Ls)^g of js/agv-ai-core.js.

Outputs:
  js/agv-net.js                         weights + normalisation + metrics (window.GAIA_AGV_NET)
  models/agv-net/metrics.json           validation scores, per crop
Run:  python ml/agv-net/02_train.py
"""
import csv
import json
import math
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
DATA = os.path.join(HERE, "data", "wofost_tunisia.csv")
OUT_JS = os.path.join(ROOT, "js", "agv-net.js")
OUT_METRICS = os.path.join(ROOT, "models", "agv-net", "metrics.json")
CROPS = ["wheat", "potato"]
FEATURES = ["is_wheat", "is_potato", "L", "rad_gj", "tmax", "tmin", "shift"]
FORMULA = {"wheat": (0.65, 1.7), "potato": (0.74, 0.56)}   # calibrated values in agv-ai-core.js
# chosen by leave-one-site-out validation (ml/agv-net/README.md): latitude removed (it let the
# network memorise sites), one small hidden layer with weight decay generalises best
HIDDEN, EPOCHS, L2 = [16], 2000, 1e-3
ALL_FEATURES = ["is_wheat", "is_potato", "L", "lat", "rad_gj", "tmax", "tmin", "shift"]


def load():
    X, Y, meta = [], [], []
    with open(DATA, encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            c = r["crop"]
            X.append([1.0 if c == "wheat" else 0.0, 1.0 if c == "potato" else 0.0, float(r["L"]), float(r["lat"]),
                      float(r["rad"]) / 1000, float(r["tmax"]), float(r["tmin"]), float(r["sow_shift"]) / 20])
            Y.append([float(r["yrel"]), float(r["yield_full"]) / 1000])
            meta.append((r["site"], c, float(r["L"])))
    keep = [ALL_FEATURES.index(f) for f in FEATURES]
    return np.array(X)[:, keep], np.array(Y), meta


class MLP:
    def __init__(self, sizes, seed=0):
        rng = np.random.default_rng(seed)
        self.W = [rng.normal(0, math.sqrt(1 / a), (a, b)) for a, b in zip(sizes[:-1], sizes[1:])]
        self.b = [np.zeros(b) for b in sizes[1:]]

    def forward(self, X):
        hs = [X]
        for i, (W, b) in enumerate(zip(self.W, self.b)):
            z = hs[-1] @ W + b
            hs.append(np.tanh(z) if i < len(self.W) - 1 else z)
        return hs

    def fit(self, X, Y, epochs=4000, lr=3e-3, l2=1e-5):
        m = [np.zeros_like(p) for p in self.W + self.b]
        v = [np.zeros_like(p) for p in self.W + self.b]
        b1, b2, eps = 0.9, 0.999, 1e-8
        for t in range(1, epochs + 1):
            hs = self.forward(X)
            d = 2 * (hs[-1] - Y) / len(X)
            gW, gb = [], []
            for i in range(len(self.W) - 1, -1, -1):
                gW.insert(0, hs[i].T @ d + l2 * self.W[i])
                gb.insert(0, d.sum(0))
                if i:
                    d = (d @ self.W[i].T) * (1 - hs[i] ** 2)
            params, grads = self.W + self.b, gW + gb
            for k, (p, g) in enumerate(zip(params, grads)):
                m[k] = b1 * m[k] + (1 - b1) * g
                v[k] = b2 * v[k] + (1 - b2) * g * g
                p -= lr * (m[k] / (1 - b1 ** t)) / (np.sqrt(v[k] / (1 - b2 ** t)) + eps)
        return self

    def predict(self, X):
        return self.forward(X)[-1]


def norm_fit(A):
    mu, sd = A.mean(0), A.std(0)
    sd[sd == 0] = 1
    return mu, sd


def train(X, Y, seed=0):
    xm, xs = norm_fit(X)
    ym, ys = norm_fit(Y)
    net = MLP([X.shape[1]] + HIDDEN + [Y.shape[1]], seed).fit((X - xm) / xs, (Y - ym) / ys, epochs=EPOCHS, l2=L2)
    return net, xm, xs, ym, ys


def scores(y, p):
    err = p - y
    ss = ((y - y.mean()) ** 2).sum()
    return {"mae": round(float(np.abs(err).mean()), 4), "rmse": round(float(np.sqrt((err ** 2).mean())), 4),
            "r2": round(float(1 - (err ** 2).sum() / ss), 4) if ss > 0 else None}


def main():
    X, Y, meta = load()
    sites = np.array([m[0] for m in meta])
    crops = np.array([m[1] for m in meta])
    names = sorted(set(sites.tolist()))
    print(f"{len(X)} rows, {len(names)} sites; leave-one-site-out validation")

    # leave-one-site-out: train on 12 sites, predict the 13th, for every site in turn
    P = np.zeros_like(Y)
    for s in names:
        te = sites == s
        net, xm, xs, ym, ys = train(X[~te], Y[~te])
        P[te] = net.predict((X[te] - xm) / xs) * ys + ym
        print("  held out", s, flush=True)
    metrics = {"rows": int(len(X)), "sites": names, "validation": "leave-one-site-out", "test_sites": names,
               "network": {"features": FEATURES, "hidden": HIDDEN, "epochs": EPOCHS, "l2": L2}, "crops": {}}
    for c in CROPS:
        k = crops == c
        Ls, g = FORMULA[c]
        base = np.minimum(1, X[k][:, FEATURES.index("L")] / Ls) ** g
        site_mean = np.array([Y[(crops == c) & (sites != s), 1].mean() for s in sites[k]])
        metrics["crops"][c] = {
            "yrel_network": scores(Y[k][:, 0], P[k][:, 0]),
            "yrel_formula": scores(Y[k][:, 0], base),
            "yield_full_t_ha": scores(Y[k][:, 1], P[k][:, 1]),
            "yield_full_mean_baseline": scores(Y[k][:, 1], site_mean),
        }
        print(c, json.dumps(metrics["crops"][c]))

    # final model on every site
    net, xm, xs, ym, ys = train(X, Y)
    r = lambda a: [round(float(x), 5) for x in np.ravel(a)]
    payload = {
        "name": "GAIA AgriNet", "version": 1, "features": FEATURES, "outputs": ["yrel", "yield_full_t_ha"],
        "layers": [{"in": int(W.shape[0]), "out": int(W.shape[1]), "W": r(W), "b": r(b)} for W, b in zip(net.W, net.b)],
        "x_mean": r(xm), "x_std": r(xs), "y_mean": r(ym), "y_std": r(ys),
        "trained_on": "WOFOST 7.2 (PCSE) potential production, NASA POWER weather 2001-2022, " + str(len(set(sites.tolist()))) + " Tunisian sites, " + str(len(X)) + " simulated seasons x light levels",
        "validation": metrics,
    }
    js = ("/* GAIA AgriNet: neural network trained on WOFOST crop-model runs in Tunisia (ml/agv-net).\n"
          "   Generated by ml/agv-net/02_train.py; do not edit by hand. */\n"
          "(function (root) { var net = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"
          "  if (typeof module !== 'undefined' && module.exports) module.exports = net; else root.GAIA_AGV_NET = net;\n"
          "}(typeof window !== 'undefined' ? window : this));\n")
    with open(OUT_JS, "w", encoding="utf-8") as fh:
        fh.write(js)
    os.makedirs(os.path.dirname(OUT_METRICS), exist_ok=True)
    with open(OUT_METRICS, "w", encoding="utf-8") as fh:
        json.dump(metrics, fh, ensure_ascii=False, indent=2)
    print("wrote", OUT_JS, f"({len(js) // 1024} KB) and", OUT_METRICS)


if __name__ == "__main__":
    main()
