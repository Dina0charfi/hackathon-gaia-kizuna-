"""Export v4: Pl@ntNet's MobileNetV4 (species logits) + GAIA disease heads on its pooled features, in one ONNX file.

    python scripts/23_export_v4.py --plantnet pn/model.onnx --heads models_out/heads_plantnet.npz \
        --report models_out/report_plantnet.json --plants tomato potato pepper \
        --manifest ../../models/gaia-vision/manifest.json --dest ../../models/gaia-vision --dest ../../backend/models/gaia-vision

The file keeps Pl@ntNet's "logits" output (7,806 species, used by the species identification in health.js) and adds
one output per head (Gemm on /flatten/Flatten_output_0). The 1280 x 7806 species classifier is quantised to int8
(top-3 identical to fp32 on our checks); the backbone and GAIA's heads stay fp32. The manifest's stage2 entries for
--plants are replaced by entries that point to this file, with their own 512 px input; the others are untouched.
"""
import argparse, json, shutil
from pathlib import Path

import numpy as np, onnx, onnxruntime as ort
from onnx import helper, numpy_helper
from onnxruntime.quantization import QuantType, quantize_dynamic

FEAT = "/flatten/Flatten_output_0"
FILE = "gaia-vision-v4-pn.onnx"
INPUT = {"size": 512, "mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plantnet", required=True); ap.add_argument("--heads", required=True); ap.add_argument("--report", required=True)
    ap.add_argument("--plants", nargs="+", required=True); ap.add_argument("--manifest", required=True)
    ap.add_argument("--dest", action="append", required=True); ap.add_argument("--tmp", default="models_out")
    a = ap.parse_args()
    H, rep = np.load(a.heads), json.load(open(a.report))
    # quantise Pl@ntNet's species classifier first (adding outputs that share its input stops the quantiser), then add the heads
    tmp = Path(a.tmp); tmp.mkdir(parents=True, exist_ok=True)
    qbase = tmp / "plantnet_int8.onnx"
    quantize_dynamic(a.plantnet, str(qbase), op_types_to_quantize=["Gemm", "MatMul"], weight_type=QuantType.QInt8)
    m = onnx.load(str(qbase)); g = m.graph
    for p in a.plants:
        W, b = H[f"{p}_W"].astype(np.float32), H[f"{p}_b"].astype(np.float32)
        g.initializer.extend([numpy_helper.from_array(W, f"head_{p}_W"), numpy_helper.from_array(b, f"head_{p}_b")])
        g.node.append(helper.make_node("Gemm", [FEAT, f"head_{p}_W", f"head_{p}_b"], [p], name=f"head_{p}", transB=1))
        g.output.append(helper.make_tensor_value_info(p, onnx.TensorProto.FLOAT, ["batch", W.shape[0]]))
    onnx.checker.check_model(m)
    q = tmp / FILE
    onnx.save(m, q)
    fp32 = Path(a.plantnet)
    # parity: heads computed from the exported graph == numpy heads on the fp32 features
    x = np.random.default_rng(0).standard_normal((2, 3, 512, 512)).astype(np.float32)
    sq = ort.InferenceSession(str(q), providers=["CPUExecutionProvider"])
    mf = onnx.load(a.plantnet); mf.graph.output.append(helper.make_tensor_value_info(FEAT, onnx.TensorProto.FLOAT, None))
    s32 = ort.InferenceSession(mf.SerializeToString(), providers=["CPUExecutionProvider"])
    o32, oq = s32.run(None, {"pixel_values": x}), sq.run(None, {"pixel_values": x})
    names = [o.name for o in sq.get_outputs()]
    for p in a.plants:
        ref = o32[1] @ H[f"{p}_W"].T + H[f"{p}_b"]
        print(f"{p}: exported head vs numpy head on fp32 features, max |diff| = {np.abs(ref - oq[names.index(p)]).max():.2e}")
    top32, topq = np.argsort(-o32[0], 1)[:, :3], np.argsort(-oq[0], 1)[:, :3]
    print("species top-3 identical:", bool((top32 == topq).all()), "size MB", round(q.stat().st_size / 1e6, 1))
    man = json.load(open(a.manifest))
    for p in a.plants:
        r = rep[p]
        man["stage2"][p] = {"file": FILE, "output": p, "input": INPUT, "backbone": "PlantNet/mobilenetv4-conv-s-plantclef2024 (frozen) + linear head",
                            "classes": r["classes"], "temperature": r["temperature"], "threshold": r["threshold"]}
    man["version"] = man.get("version", "").split("+")[0] + "+v4pn"
    man["species_model"] = {"file": FILE, "output": "logits", "input": INPUT, "labels": "plantnet-labels.json",
                            "source": "https://huggingface.co/PlantNet/mobilenetv4-conv-s-plantclef2024", "license": "Apache-2.0"}
    for d in a.dest:
        d = Path(d); d.mkdir(parents=True, exist_ok=True); shutil.copy(q, d / FILE)
        json.dump(man, open(d / "manifest.json", "w"), indent=2, ensure_ascii=False)
        print("wrote", d / FILE, d / "manifest.json")


if __name__ == "__main__":
    main()
