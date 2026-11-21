# GAIA — modèle entraîné : humidité du sol à 7 jours

Notebook : [`prevision_humidite_sol.ipynb`](prevision_humidite_sol.ipynb)

Il télécharge 9 ans (2016–2024) de données journalières pour 18 sites agricoles tunisiens
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

| | Erreur J+1 | Erreur J+7 | Gain moyen vs persistance |
|---|---|---|---|
| Années jamais vues | 0,0042 m³/m³ | 0,0144 m³/m³ | 36 % |
| Lieux jamais vus | 0,0043 m³/m³ | 0,0148 m³/m³ | 38 % |

## Fichiers produits

- `data/*.csv` : les données téléchargées, un fichier par site
- `models/humidite_sol_J1.txt` … `J7.txt` : les modèles LightGBM (chargeables avec `lightgbm.Booster(model_file=...)`)
- `models/meta.json` : variables attendues par chaque modèle, seuils sec/humide par site, résultats

## Limites

- L'humidité ERA5-Land est une reconstruction de modèle (~9 km), pas une mesure de terrain.
- À l'entraînement, la météo des 7 jours suivants est la météo observée ; en usage réel c'est une prévision.
- Le seuil d'irrigation (réserve < 30 %) est une hypothèse de démonstration, à remplacer par les seuils FAO-56 de la culture.
