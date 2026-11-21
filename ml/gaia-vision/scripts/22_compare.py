"""Compare backbones on the same leakage-free split, with the same linear heads as 12_train_heads.py.

    python scripts/22_compare.py --data data --tags effb0 plantnet dino plantnet+dino --plants tomato potato pepper grape
Prints field / lab test accuracy per head and backbone, and saves data/compare.json.
With --export TAG it also writes models_out/heads_<TAG>.npz + report_<TAG>.json for that backbone (used by 23_export_v4.py).
"""
import argparse, importlib.util, json, sys
from pathlib import Path

import numpy as np, pandas as pd, torch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("heads12", HERE / "12_train_heads.py"); H = importlib.util.module_from_spec(spec); spec.loader.exec_module(H)

def load(data, tag):
    parts = tag.split("+")
    E = np.concatenate([np.load(data / f"{p}_clean.npy") for p in parts], 1)
    if all((data / f"{p}_aug.npy").exists() for p in parts):
        idx = [np.load(data / f"{p}_aug_idx.npy") for p in parts]
        assert all((i == idx[0]).all() for i in idx), "augmented views must be aligned to concatenate"
        A = np.concatenate([np.load(data / f"{p}_aug.npy") for p in parts], 1); Aidx = idx[0]
    else:
        A, Aidx = np.zeros((0, E.shape[1]), np.float32), np.zeros(0, int)
    return E, A, Aidx

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path, default=Path("data")); ap.add_argument("--tags", nargs="+", required=True)
    ap.add_argument("--plants", nargs="+", default=None); ap.add_argument("--stage1", action="store_true")
    ap.add_argument("--export", default=None); ap.add_argument("--out", type=Path, default=Path("models_out"))
    a = ap.parse_args(); torch.set_num_threads(4)
    df = pd.read_csv(a.data / "split.csv"); res = {}
    plants = a.plants or sorted(p for p in df.plant.unique() if p != "other")
    for tag in a.tags:
        E, A, Aidx = load(a.data, tag); res[tag] = {}; heads = {}
        tasks = ([("stage1", df, "plant")] if a.stage1 else []) + [(p, df[df.plant == p], "disease") for p in plants]
        for name, d, col in tasks:
            if d[col].nunique() < 2: continue
            rep, W, b = H.run_task(name, d, col, E, A, Aidx); heads[name] = (W, b)
            res[tag][name] = rep
            f, l = rep["test_field"] or {}, rep["test_lab"] or {}
            print(f"{tag:16s} {name:8s} field {f.get('accuracy')} (n={f.get('n')}, F1 {f.get('macro_f1')}, answers {f.get('coverage_at_threshold')} -> {f.get('accuracy_when_answering')})"
                  f"  lab {l.get('accuracy')} (n={l.get('n')})", flush=True)
        if a.export == tag:
            a.out.mkdir(parents=True, exist_ok=True)
            np.savez(a.out / f"heads_{tag}.npz", **{f"{k}_W": v[0] for k, v in heads.items()}, **{f"{k}_b": v[1] for k, v in heads.items()})
            json.dump(res[tag], open(a.out / f"report_{tag}.json", "w"), indent=2)
    slim = {t: {n: {"field": r["test_field"], "lab": r["test_lab"], "classes": r["classes"]} for n, r in v.items()} for t, v in res.items()}
    old = json.load(open(a.data / "compare.json")) if (a.data / "compare.json").exists() else {}
    old.update(slim); json.dump(old, open(a.data / "compare.json", "w"), indent=2)

if __name__ == "__main__":
    main()
