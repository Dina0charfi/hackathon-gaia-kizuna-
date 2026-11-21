"""Leakage-free split for v4, without PyTorch: clean EfficientNet-B0 embeddings from the shipped ONNX
(same backbone and threshold as 11_embed_split.py), near-duplicate groups, stratified group split.

    python scripts/20_split_onnx.py --index data/index.csv --onnx ../../models/gaia-vision/gaia-vision-effb0.onnx
Writes data/effb0_clean.npy and data/split.csv.
"""
import argparse, importlib.util, sys
from pathlib import Path

import numpy as np, pandas as pd

HERE = Path(__file__).resolve().parent
def mod(name):
    spec = importlib.util.spec_from_file_location(name.replace(".py", ""), HERE / name); m = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = m; spec.loader.exec_module(m); return m

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--index", default="data/index.csv"); ap.add_argument("--onnx", required=True)
    ap.add_argument("--dup", type=float, default=0.93); a = ap.parse_args()
    E21 = mod("21_embed_onnx.py")
    import random
    df = pd.read_csv(a.index); out = Path(a.index).parent; f = out / "effb0_clean.npy"
    s, inp = E21.session(a.onnx, "/backbone/global_pool/flatten/Flatten_output_0")
    if f.exists(): E = np.load(f)
    else: E = E21.embed(s, inp, "/backbone/global_pool/flatten/Flatten_output_0", list(df.path), 224, "clean", 0, label="effb0 clean"); np.save(f, E)
    # group + split exactly like 11_embed_split.py (functions copied there; imported here without torch)
    src = (HERE / "11_embed_split.py").read_text()
    ns = {"np": np, "random": random, "collections": __import__("collections")}
    for fn in ("groups_of", "split_groups"):
        start = src.index(f"def {fn}"); end = src.index("\ndef ", start + 5); exec(src[start:end], ns)
    En = E / np.linalg.norm(E, axis=1, keepdims=True); df["group"] = ""
    for plant, idx in df.groupby("plant").groups.items():
        idx = np.asarray(idx); g = ns["groups_of"](En[idx], a.dup); df.loc[idx, "group"] = [f"{plant}:{x}" for x in g]
    df["split"] = ns["split_groups"](df)
    print(df.groupby(["plant", "domain", "split"]).size().unstack(fill_value=0))
    df.to_csv(out / "split.csv", index=False)

if __name__ == "__main__":
    main()
