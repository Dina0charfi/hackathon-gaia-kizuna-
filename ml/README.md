# GAIA — modèle entraîné : humidité du sol, aujourd'hui et 7 jours

Notebook : [`prevision_humidite_sol.ipynb`](prevision_humidite_sol.ipynb)

Il télécharge les données journalières de janvier 2020 jusqu'à hier pour 26 sites agricoles couvrant
les 24 gouvernorats tunisiens, entraîne un modèle LightGBM par horizon (J+1 … J+8) pour prédire
l'humidité du sol 7–28 cm, l'évalue sur les années les plus récentes et sur des lieux jamais vus,
puis transforme la prédiction en plan d'irrigation pour aujourd'hui et les 7 jours suivants.

## Données

Open-Meteo, modèle **ECMWF IFS** (analyses du centre européen, ~9 km), pour l'humidité du sol et la météo.

- C'est ce que le mode par défaut de l'archive Open-Meteo sert depuis 2017 (en 2016, c'était ERA5-Land ;
  vérifié en comparant les deux séries). On commence en 2020 pour n'avoir qu'une seule source.
- En direct, la même source vient de l'API de prévision (`models=ecmwf_ifs`) : mêmes valeurs à 0,000 près
  sur les jours communs, disponibles jusqu'à hier, sans retard de publication. Le notebook l'utilise aussi
  pour compléter les 3 derniers mois, et le backend pour la prévision du site.

## Lancer

```
pip install -r requirements.txt
jupyter notebook prevision_humidite_sol.ipynb
```

Les données sont en cache dans `data/` ; un nouveau lancement ne télécharge que les jours qui manquent.

## Découpage

Entraînement 2020–2023 · validation 2024 · **test 2025 → hier**, plus 4 sites jamais vus à l'entraînement
(Bou Salem, Sbeitla, Msaken, Kébili).

Les scores ci-dessous sont mesurés sur ces données de test, jamais vues. Ensuite, les **modèles finaux**
(humidité J+1 … J+8 et pluie efficace) sont réentraînés avec les mêmes réglages sur **toutes les données :
les 26 sites, de 2020 jusqu'à hier**. Ce sont eux que le backend et la page utilisent.

## Résultats (test 2025–2026)

Chaque chiffre est comparé à la persistance (« dans h jours, le sol sera comme aujourd'hui »).

**Humidité du sol (section 9)**

| | R² de la variation | Erreur moyenne J+1 / J+7 | Gain vs persistance |
|---|---|---|---|
| Années jamais vues | 0,36 → 0,46 | 0,6 / 2,3 mm d'eau | 23 % |
| Lieux jamais vus | 0,47 → 0,51 | 0,5 / 2,4 mm d'eau | 28 % |

Le R² de l'humidité elle-même (≈ 0,96) est flatteur : la persistance atteint déjà ≈ 0,9.
Le R² de la variation est le chiffre honnête.

**Moments de bascule (section 10)** : la réserve passe-t-elle sous 30 % dans les 7 jours ?

| F1 | Persistance | Tendance | Trajectoire des modèles | Modèle dédié |
|---|---|---|---|---|
| Années jamais vues | 0 % | 40 % | 52 % | 52 % |
| Lieux jamais vus | 0 % | 25 % | 49 % | 53 % |

Environ une bascule sur deux annoncée au bon jour à ±1 jour, avec un léger retard moyen (≈ 0,7 jour).

Ces chiffres sont plus bas qu'une version précédente du notebook, qui mélangeait deux sources de données
et testait sur des années plus anciennes ; ceux-ci sont plus modestes mais plus fiables.

**Pluie efficace (section 11)** : quelle part de chaque pluie reste dans le sol 0–100 cm ?
Mesurée pour chaque épisode (gain du sol entre la veille et le lendemain + séchage attendu), puis prédite
par LightGBM (pluie, humidité de départ, chaleur, saison, signature hydrique du site comme indice du type de sol).

| | Part de la pluie efficace | Erreur par mois : modèle / USDA-SCS | Erreur par épisode : modèle / USDA-SCS / fraction fixe |
|---|---|---|---|
| Années jamais vues | mesurée 60 %, USDA-SCS 90 % | 6,3 / 12,0 mm | 3,7 / 4,5 / 4,1 mm |
| Lieux jamais vus | mesurée 67 %, USDA-SCS 93 % | 5,2 / 9,9 mm | 3,1 / 3,2 / 3,2 mm |

Le gain vient surtout de ce que la formule surestime la pluie utile ; par épisode, le modèle n'améliore que
de peu une part fixe sur les lieux jamais vus. Les données n'ont pas de texture de sol : la signature hydrique
du site (niveaux sec / humide à chaque profondeur) en tient lieu.

## Fichiers produits

- `data/*.csv` : météo et humidité du sol, un fichier par site
- `models/humidite_sol_J1.txt` … `J8.txt` : les modèles LightGBM, utilisés par le backend
- `models/meta.json` : variables, seuils sec/humide par site, résultats, prédiction de référence
- `models/bascule_7j.txt`, `models/bascule_meta.json` : le classifieur dédié aux moments de bascule
- `models/pluie_efficace.txt`, `models/pluie_efficace_meta.json` : le modèle de pluie efficace, ses résultats et la part efficace par mois pour chaque site, lue par la page Eau & énergie

## Limites

- L'humidité ECMWF IFS est une analyse de modèle (~9 km), pas une mesure de terrain ; elle ne sait pas si la parcelle est irriguée.
- À l'entraînement, la météo des jours suivants est la météo observée ; en usage réel c'est une prévision.
- La pluie efficace décrit un sol nu non irrigué de la zone ; une parcelle paillée, en terrasse (jessour) ou irriguée peut garder plus d'eau.
- Le seuil d'irrigation (réserve < 30 %) est une hypothèse de démonstration, à remplacer par les seuils FAO-56 de la culture.
