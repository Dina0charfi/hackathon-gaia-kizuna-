"""Assemble the manifest in the schema js/health.js expects, and copy ONNX files next to it.
  python scripts/04_build_manifest.py --dest ../../models/gaia-vision --version 2026.11-v1
Run from ml/gaia-vision. Guidance entries come from advice.json and are included ONLY if validated_by is filled.
"""
import argparse, json, shutil
from pathlib import Path

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dest", type=Path, default=Path("../../models/gaia-vision"))
    ap.add_argument("--version", default="2026.11-v1")
    a = ap.parse_args(); src = Path("models_out"); a.dest.mkdir(parents=True, exist_ok=True)
    pick = lambda j: {k: j[k] for k in ("file", "classes", "temperature", "threshold")}
    man = {"version": a.version,
           "input": {"size": 224, "mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225]},
           "stage1": pick(json.load(open(src / "tree.json"))), "stage2": {}, "guidance": {}, "evaluation": {}}
    for f in sorted(src.glob("disease_*.json")):
        j = json.load(open(f)); tree = f.stem.split("_", 1)[1]
        man["stage2"][tree] = pick(j); man["evaluation"][tree] = j["eval"]
    adv = Path("advice.json")
    if adv.exists():
        for k, v in json.load(open(adv)).items():
            if k.startswith("_") or not isinstance(v, dict): continue
            if v.get("validated_by") and v.get("fr"): man["guidance"][k] = {x: v[x] for x in ("fr", "ar", "validated_by", "date") if x in v}
    for f in src.glob("*.onnx"): shutil.copy(f, a.dest / f.name)
    json.dump(man, open(a.dest / "manifest.json", "w"), indent=2, ensure_ascii=False)
    print("written", a.dest / "manifest.json", "| guidance entries:", len(man["guidance"]))

if __name__ == "__main__":
    main()
