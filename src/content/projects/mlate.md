---
title: MLATE
status: active
tier: featured
order: 1
years:
  start: 2023
summary: >-
  Machine Learning Applications in Tissue Engineering: open models and data that
  predict how a scaffold will print and how cells will respond to it, rank
  candidate formulations, and suggest what to fabricate next.
facts: Python · 2,646 scaffold samples · 130 biomaterials · 186 cell lines · 18 tissue contexts
role: Lead developer
methods: Gradient boosting, deep and tabular foundation models, Bayesian optimisation, LLM-assisted protocol generation
data: Literature-derived scaffold dataset, released openly with the code
links:
  code: https://github.com/saeedrafieyan/MLATE
  app: https://mlate.ir
figure:
  image: /uploads/mlate-v2-pipeline.png
  alt: Diagram of the MLATE pipeline from literature data gathering and cleaning, to dataset creation, to clustering, machine learning and deep learning models.
  caption: From literature to dataset to models (MLATE V2).
versions:
  - version: V1
    year: 2023
    scope: Cardiac scaffolds; 28 algorithms benchmarked for cell behaviour
    publication: 2023-rafieyan-mlate-machine
  - version: V2
    year: 2024
    scope: 3D (bio)printed scaffolds; 1,171 scaffolds, 60 biomaterials, 49 cell lines
    publication: 2024-rafieyan-practical-machine
  - version: V3
    year: 2026
    scope: Multi-tissue; WSSQ ranking, Bayesian optimisation and an open web app
    publication: 2026-rafieyan-mlate-v3
---

Designing a tissue-engineering scaffold means choosing biomaterials and their concentrations, cell types and densities, and printing conditions, then running experiments to see what works. Most of that search is still trial and error. MLATE turns the published literature into structured, open datasets and trains models that predict the outcome from variables known **before** fabrication.

## What it does

- **Predicts** cell response and printability from pre-fabrication variables. In V3 the best models reach weighted F1 scores of 0.773 (cell response) and 0.806 (printability).
- **Ranks** candidates with the Weighted Synergistic Scaffold Quality (WSSQ) score, which combines both predictions with adjustable weights.
- **Optimises** formulations and printing parameters inside a user-defined design space with Bayesian optimisation.
- **Plans** experiments: an LLM-assisted module drafts step-by-step fabrication protocols for the shortlisted candidates.

The aim is to narrow the experimental search space and suggest candidates worth testing, not to replace experimental validation.

## Try it

The web app runs at [mlate.ir](https://mlate.ir), and the code, datasets and analysis pipeline are on [GitHub](https://github.com/saeedrafieyan/MLATE).
