"""Train a MobileNetV3 classifier.
  python scripts/02_train.py --task tree
  python scripts/02_train.py --task disease --tree olive
"""
import argparse, json
from pathlib import Path
import pandas as pd, torch, torch.nn as nn
from PIL import Image
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms as T
from sklearn.metrics import classification_report

MEAN, STD = [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]
SIZE = 224

class DS(Dataset):
    def __init__(s, df, classes, col, tf): s.df, s.c2i, s.col, s.tf = df.reset_index(drop=True), {c: i for i, c in enumerate(classes)}, col, tf
    def __len__(s): return len(s.df)
    def __getitem__(s, i):
        r = s.df.iloc[i]
        return s.tf(Image.open(r.path).convert("RGB")), s.c2i[r[s.col]]

def tfs():
    tr = T.Compose([T.RandomResizedCrop(SIZE, scale=(0.5, 1.0)), T.RandomHorizontalFlip(), T.RandomVerticalFlip(),
                    T.RandomRotation(25), T.ColorJitter(0.35, 0.35, 0.3, 0.05), T.ToTensor(), T.Normalize(MEAN, STD)])
    # same preprocessing as the GAIA page (health.js): centre square crop, then resize
    ev = T.Compose([T.Resize(SIZE), T.CenterCrop(SIZE), T.ToTensor(), T.Normalize(MEAN, STD)])
    return tr, ev

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--task", choices=["tree", "disease"], required=True)
    ap.add_argument("--tree"); ap.add_argument("--index", default="data/index.csv")
    ap.add_argument("--epochs", type=int, default=15); ap.add_argument("--bs", type=int, default=32)
    a = ap.parse_args()
    df = pd.read_csv(a.index)
    if a.task == "tree": col, name = "tree", "tree"
    else: df, col, name = df[df.tree == a.tree], "disease", f"disease_{a.tree}"
    classes = sorted(df[col].unique()); print(name, classes, len(df), "images")
    tr_tf, ev_tf = tfs()
    ds = {s: DS(df[df.split == s], classes, col, tr_tf if s == "train" else ev_tf) for s in ["train", "val", "test"]}
    dl = {s: DataLoader(d, batch_size=a.bs, shuffle=(s == "train"), num_workers=4) for s, d in ds.items()}
    dev = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
    m = models.mobilenet_v3_large(weights=models.MobileNet_V3_Large_Weights.IMAGENET1K_V2)
    m.classifier[3] = nn.Linear(m.classifier[3].in_features, len(classes)); m.to(dev)
    cnt = df[df.split == "train"][col].value_counts()
    w = torch.tensor([len(df) / (len(classes) * cnt[c]) for c in classes], dtype=torch.float32).to(dev)
    lossf = nn.CrossEntropyLoss(weight=w, label_smoothing=0.05)
    opt = torch.optim.AdamW(m.parameters(), lr=3e-4, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, a.epochs)

    def evaluate(split):
        m.eval(); P, Y = [], []
        with torch.no_grad():
            for x, y in dl[split]: P += m(x.to(dev)).argmax(1).cpu().tolist(); Y += y.tolist()
        return sum(p == y for p, y in zip(P, Y)) / max(len(Y), 1), P, Y

    best = 0; Path("models_out").mkdir(exist_ok=True)
    for ep in range(a.epochs):
        m.train()
        for x, y in dl["train"]:
            opt.zero_grad(); lossf(m(x.to(dev)), y.to(dev)).backward(); opt.step()
        sched.step(); acc, _, _ = evaluate("val"); print(f"epoch {ep+1} val_acc {acc:.3f}")
        if acc >= best:
            best = acc; torch.save({"state": m.state_dict(), "classes": classes}, f"models_out/{name}.pt")
    m.load_state_dict(torch.load(f"models_out/{name}.pt")["state"])
    acc, P, Y = evaluate("test"); print("TEST acc", acc)
    print(classification_report(Y, P, target_names=classes, zero_division=0))

if __name__ == "__main__":
    main()
