# GAIA — modèle entraîné : humidité du sol à 7 jours

Notebook : [`prevision_humidite_sol.ipynb`](prevision_humidite_sol.ipynb)

Il télécharge 9 ans (2016–2024) de données journalières pour 26 sites agricoles couvrant les 24 gouvernorats tunisiens
(Open-Meteo Historical API, réanalyse ERA5 / ERA5-Land), entraîne un modèle LightGBM par horizon
(J+1 … J+7) pour prédire l'humidité du sol 7–28 cm, l'évalue sur des années et des lieux jamais vus,
puis transforme la prédiction en plan d'irrigation sur 7 jours.

## Lancer

```
pip install -r requirements.txt
jupyter notebook prevision_humidite_sol.ipynb
```

Le premier lancement télécharge les données dans `data/` (environ 1 minute) ; les suivants les relisent.

## Résultats (test 2022–2024)

Chaque chiffre est comparé à la persistance (« dans h jours, le sol sera comme aujourd'hui »).

**Humidité du sol (section 9)**

| | R² de la variation J+1 → J+7 | Erreur moyenne J+1 / J+7 | Gain vs persistance |
|---|---|---|---|
| Années jamais vues | 0,59 → 0,66 | 0,4 / 1,7 mm d'eau | 39 % |
| Lieux jamais vus | 0,60 → 0,68 | 0,4 / 1,7 mm d'eau | 38 % |

Le R² de l'humidité elle-même (≈ 0,97) est flatteur : la persistance atteint déjà ≈ 0,9. Le R² de la variation est le chiffre honnête.

**Moments de bascule (section 10)** : la réserve passe-t-elle sous 30 % dans les 7 jours ?

| F1 | Persistance | Tendance | Trajectoire des 7 modèles | Modèle dédié |
|---|---|---|---|---|
| Années jamais vues | 0 % | 44 % | 58 % | 60 % |
| Lieux jamais vus | 0 % | 35 % | 56 % | 56 % |

Environ 6 bascules détectées sur 10 au bon jour à ±1 jour, avec un léger retard moyen (0,5 à 1 jour).

## Fichiers produits

- `data/*.csv` : les données téléchargées, un fichier par site
- `models/humidite_sol_J1.txt` … `J7.txt` : les modèles LightGBM (chargeables avec `lightgbm.Booster(model_file=...)`), utilisés par le backend
- `models/meta.json` : variables attendues par chaque modèle, seuils sec/humide par site, résultats
- `models/bascule_7j.txt` : le classifieur dédié aux moments de bascule
- `models/bascule_meta.json` : ses variables, son seuil de probabilité, les seuils des sites (années d'entraînement), ses résultats

## Limites

- L'humidité ERA5-Land est une reconstruction de modèle (~9 km), pas une mesure de terrain.
- À l'entraînement, la météo des 7 jours suivants est la météo observée ; en usage réel c'est une prévision.
- Le seuil d'irrigation (réserve < 30 %) est une hypothèse de démonstration, à remplacer par les seuils FAO-56 de la culture.
