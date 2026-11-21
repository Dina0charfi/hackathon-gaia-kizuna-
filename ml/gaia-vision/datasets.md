# Datasets (all free; check each licence before shipping the model)

## Olive (Tunisia's #1 tree — start here)
- Roboflow "olive's leaf diseases" (Healthy / Aculus olearius / Knot) — CC BY 4.0
  https://universe.roboflow.com/baraah/olive-s-leaf-diseases-tvce5   (also .../olive-bpehy)
- Roboflow "olive1" (Healthy / aculus_olearius / olive_peacock_spot) — CC BY 4.0
  https://universe.roboflow.com/project-9k7w7/olive1-ngwty
- Roboflow "olive_leaf2" — CC BY 4.0
  https://universe.roboflow.com/workspace-nukcs/olive_leaf2-hxo82
- HuggingFace "olive_leaf_disease_dataset" (17 labels) — https://huggingface.co/datasets/kalil99x/olive_leaf_disease_dataset
- Paper using 11,315 olive leaf images (Healthy/Aculus/Scab), OLIVE-CAD: https://www.preprints.org/manuscript/202511.1135
- LIDL4Oliv (Tunisian authors, Sfax): https://www.scitepress.org/Papers/2024/124669/124669.pdf  (ask authors for data)
Download: on Roboflow pick "Download Dataset" -> format "Folder Structure" (classification) -> zip.

## Date palm
- "Diseases of date palm leaves dataset" (Mendeley, 608 raw images, 8 disorders + healthy: potassium/manganese/magnesium
  deficiency, black scorch, leaf spots, fusarium wilt, rachis blight, Parlatoria blanchardi)
  https://data.mendeley.com/datasets/g684ghfxvg/2   (paper: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11456780/)
- Dubas insect dataset (3000 drone images; healthy / bugs / honeydew / mixed)
  https://data.mendeley.com/datasets/2nh364p2bc

## Citrus
- "Citrus Fruits and Leaves Dataset" (Mendeley, CC BY 4.0): Black spot, Canker, Greening, Melanose, Healthy (609 leaf images)
  https://data.mendeley.com/datasets/3f83gxmv57/2
- Same data on HuggingFace: https://huggingface.co/datasets/Project-AgML/citrus_fruit_leaf_disease_classification
- TFDS version (594 leaf images, 4 classes): https://www.tensorflow.org/datasets/catalog/citrus_leaves

## 13 extra crops — PlantVillage (lab photos, plain background)
- HF mirror used by the notebooks: https://huggingface.co/datasets/Project-AgML/plant_village_classification
- Original: https://data.mendeley.com/datasets/tywbtsjrjv  (54k images, 38 classes: apple, blueberry, cherry, corn, grape, orange, peach, pepper, potato, raspberry, soybean, squash, strawberry, tomato)
- Orange (Haunglongbing) is merged into citrus/greening.

## "other" class (the page must refuse unsupported things)
- Notebook default: Oxford Flowers 102 + PlantVillage "background" images. Weak: add your own photos in raw/other_crops/<name>/.

## Strongly recommended
Photos of leaves from YOUR region/phones (the GAIA Kaizen corrections). Public datasets are mostly lab/clean
backgrounds, so accuracy on real orchard photos will be lower than the test numbers.
