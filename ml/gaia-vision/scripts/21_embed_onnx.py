"""Embed the index with any ONNX backbone (no PyTorch model needed), for the v4 backbone comparison.

    python scripts/21_embed_onnx.py --index data/index.csv --split data/split.csv --onnx pn/model.onnx \
        --feature /flatten/Flatten_output_0 --size 512 --tag plantnet --views 2

--feature names the pooled feature tensor inside the graph (it is added as an extra output), or "dino" for a
DINOv2 graph (CLS token and mean patch token of last_hidden_state, concatenated).
Writes data/<tag>_clean.npy, data/<tag>_aug.npy and data/<tag>_aug_idx.npy (same layout as 11_embed_split.py,
so 22_compare.py can train the same heads on every backbone). The split is reused, never recomputed, so all
backbones are compared on exactly the same leakage-free test images.
"""
import argparse, random
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np, onnx, onnxruntime as ort, pandas as pd
from PIL import Image, ImageEnhance, ImageFilter

MEAN = np.array([0.485, 0.456, 0.406], np.float32)[:, None, None]
STD = np.array([0.229, 0.224, 0.225], np.float32)[:, None, None]


def clean(im, size):
    """same as js/health.js: centre square crop, resize."""
    w, h = im.size; s = min(w, h)
    return im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).resize((size, size), Image.BICUBIC)


def aug(im, size, rng):
    w, h = im.size; area = w * h
    for _ in range(10):
        a = area * rng.uniform(0.45, 1.0); r = rng.uniform(0.8, 1.25)
        cw, ch = int(round((a * r) ** 0.5)), int(round((a / r) ** 0.5))
        if cw <= w and ch <= h:
            x, y = rng.randint(0, w - cw), rng.randint(0, h - ch); im = im.crop((x, y, x + cw, y + ch)); break
    im = im.resize((size, size), Image.BICUBIC)
    if rng.random() < 0.5: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if rng.random() < 0.5: im = im.transpose(Image.FLIP_TOP_BOTTOM)
    im = im.rotate(rng.uniform(-30, 30), resample=Image.BILINEAR)
    for E, k in ((ImageEnhance.Brightness, 0.4), (ImageEnhance.Contrast, 0.4), (ImageEnhance.Color, 0.35)):
        im = E(im).enhance(rng.uniform(1 - k, 1 + k))
    if rng.random() < 0.3: im = im.filter(ImageFilter.GaussianBlur(rng.uniform(0.1, 1.6)))
    return im


def tensor(im):
    return ((np.asarray(im, np.float32).transpose(2, 0, 1) / 255.0 - MEAN) / STD).astype(np.float32)


def session(path, feature):
    m = onnx.load(path)
    if feature != "dino" and feature not in [o.name for o in m.graph.output]:
        m.graph.output.append(onnx.helper.make_tensor_value_info(feature, onnx.TensorProto.FLOAT, None))
    so = ort.SessionOptions(); so.intra_op_num_threads = 4
    s = ort.InferenceSession(m.SerializeToString(), so, providers=["CPUExecutionProvider"])
    return s, s.get_inputs()[0].name


def run(s, inp, feature, X):
    if feature == "dino":
        h = s.run(["last_hidden_state"], {inp: X})[0]
        return np.concatenate([h[:, 0], h[:, 1:].mean(1)], 1)
    return s.run([feature], {inp: X})[0].reshape(len(X), -1)


def embed(s, inp, feature, paths, size, mode, seed, bs=32, label=""):
    out, rng = [], random.Random(seed)
    seeds = [rng.random() for _ in paths]
    def load(i):
        im = Image.open(paths[i]).convert("RGB")
        return tensor(clean(im, size) if mode == "clean" else aug(im, size, random.Random(seeds[i])))
    with ThreadPoolExecutor(3) as ex:
        for k in range(0, len(paths), bs):
            X = np.stack(list(ex.map(load, range(k, min(k + bs, len(paths))))))
            out.append(run(s, inp, feature, X).astype(np.float32))
            if (k // bs) % 25 == 0: print(f"  {label} {k}/{len(paths)}", flush=True)
    return np.concatenate(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--split", default="data/split.csv"); ap.add_argument("--onnx", required=True)
    ap.add_argument("--feature", required=True); ap.add_argument("--size", type=int, default=224)
    ap.add_argument("--tag", required=True); ap.add_argument("--views", type=int, default=2)
    a = ap.parse_args()
    df = pd.read_csv(a.split); out = Path(a.split).parent
    s, inp = session(a.onnx, a.feature)
    f = out / f"{a.tag}_clean.npy"
    if not f.exists(): np.save(f, embed(s, inp, a.feature, list(df.path), a.size, "clean", 0, label=a.tag + " clean"))
    tr = np.nonzero((df.split == "train").to_numpy())[0]
    A = [embed(s, inp, a.feature, list(df.path.iloc[tr]), a.size, "aug", v + 1, label=f"{a.tag} aug {v + 1}") for v in range(a.views)]
    np.save(out / f"{a.tag}_aug.npy", np.concatenate(A)); np.save(out / f"{a.tag}_aug_idx.npy", np.tile(tr, a.views))
    print("saved", a.tag)


if __name__ == "__main__":
    main()
