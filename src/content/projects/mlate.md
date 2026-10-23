---
title: MLATE
full_name: Machine Learning Applications in Tissue Engineering
status: active
status_label: Published research · Open-source software
category: research
tier: featured
order: 1
years:
  start: 2022
summary: An open-source framework that uses literature-derived data and machine
  learning to predict scaffold printability and cell response, helping
  researchers prioritise candidate formulations for experimental testing.
facts: 2,646 literature-derived samples · 130 biomaterials · 186 cell lines · 18
  tissue-engineering contexts
role: Lead developer
methods: Machine learning, deep learning and tabular foundation models; Bayesian
  optimisation; LLM-assisted protocol drafting
data: Literature-derived scaffold dataset, published with the code
links:
  code: https://github.com/saeedrafieyan/MLATE
  app: https://huggingface.co/spaces/Saeed/MLATE
figure:
  image: /uploads/figworkflowoverviewv4for-paper.png
  alt: "Overview of the MLATE V3 workflow in two phases. Phase A is built once from
    the literature corpus: curate a dataset of 2,646 scaffolds from 220 studies,
    impute missing values within each cross-validation fold, cluster the data,
    benchmark machine learning, deep learning and foundation models for
    printability and cell response, and combine both predictions into the WSSQ
    score. Phase B runs for each user query: the web application, Bayesian
    optimisation of the WSSQ score, a ranked shortlist of candidates and a
    step-by-step draft fabrication protocol."
  caption: "The MLATE V3 workflow: from literature-derived data to a ranked
    shortlist of candidates for experimental testing."
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
    scope: Multi-tissue; WSSQ ranking, Bayesian optimisation and a public web app
    publication: 2026-rafieyan-mlate-v3
---
Designing a tissue-engineering scaffold means choosing biomaterials and their concentrations, cell types and densities, and printing conditions, then running experiments to see what works. Much of that search is still trial and error. MLATE turns the published literature into structured datasets and trains models that predict outcomes from variables known **before** fabrication, so that researchers can decide which candidates are worth testing.

MLATE began with my MSc research at Tarbiat Modares University and has since been developed through three published versions.

### What it does

- **Predicts** cell response and printability from pre-fabrication variables. MLATE V3 is built on an open dataset of 2,646 samples covering 130 biomaterials, 186 cell lines and 18 tissue-engineering contexts. The best-performing models reach weighted F1-scores of 0.773 for cell response and 0.806 for printability.
- **Ranks** candidates with the Weighted Synergistic Scaffold Quality (WSSQ) score, which combines both predictions with adjustable weights.
- **Searches** a user-defined range of biomaterial compositions and printing parameters with Bayesian optimisation, and proposes candidate formulations for testing.
- **Drafts** step-by-step fabrication protocols for the shortlisted candidates with an LLM-assisted module.

### Prediction, prioritisation and validation

MLATE is a decision-support tool. Its predictions and rankings narrow the experimental search space and suggest which candidates to fabricate and test first. They do not guarantee how a scaffold will perform: every candidate still needs experimental validation.

### Try it

The web app runs on [Hugging Face](https://huggingface.co/spaces/Saeed/MLATE), and the code, datasets and analysis pipeline are on [GitHub](https://github.com/saeedrafieyan/MLATE). The V3 paper is online ahead of print in *Biofabrication*.
