"""Build data/index.csv from raw/<tree>/<class>/*.jpg  (any number of trees).
Usage:  python scripts/01_prepare.py --raw raw
 - every sub-folder of raw/ is one plant ("tree" in the manifest): olive, palm, citrus, tomato, potato, ...
 - the folder 'other_crops' is the 'other' class (things GAIA must refuse)
Split is deterministic by file hash -> 80/10/10; files named <base>__<n>.jpg share the split of <base>
(augmented copies of one photo never leak across train/test).
"""
import argparse, collections, csv, hashlib, re
from pathlib import Path

EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
COMMON = {"healthy": "healthy", "buena": "healthy", "sana": "healthy", "health": "healthy", "healthy_sample": "healthy"}
OLIVE = {"aculus": "aculus_olearius", "scab": "peacock_spot", "olive_peacock_spot": "peacock_spot", "knot": "knot_disease"}

def norm(name, tree):
    n = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    n = re.sub(r"^\d+_", "", n)   # Mendeley palm folders are numbered: "9. Healthy sample" -> healthy_sample
    if n in COMMON: return COMMON[n]
    return OLIVE.get(n, n) if tree == "olive" else n   # olive aliases must not touch other crops

def split_of(path: Path):
    h = int(hashlib.md5(path.name.split("__")[0].encode()).hexdigest(), 16) % 100
    return "train" if h < 80 else "val" if h < 90 else "test"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", type=Path, default=Path("raw")); ap.add_argument("--out", type=Path, default=Path("data/index.csv"))
    a = ap.parse_args(); rows = []
    for tdir in sorted(p for p in a.raw.iterdir() if p.is_dir()):
        tree = "other" if tdir.name == "other_crops" else tdir.name
        for cdir in sorted(p for p in tdir.iterdir() if p.is_dir()):
            for f in cdir.rglob("*"):
                if f.suffix.lower() in EXT:
                    rows.append([str(f.resolve()), tree, norm(cdir.name, tree), split_of(f)])
    a.out.parent.mkdir(parents=True, exist_ok=True)
    with open(a.out, "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(["path", "tree", "disease", "split"]); w.writerows(rows)
    c = collections.Counter(r[1] for r in rows)
    for k, v in sorted(c.items()): print(f"{k:12s} {v}")
    print("total", len(rows), "->", a.out)

if __name__ == "__main__":
    main()
