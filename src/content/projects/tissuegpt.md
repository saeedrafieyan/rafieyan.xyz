---
title: TissueGPT
status: maintained
category: resource
tier: standard
order: 10
years:
  start: 2024
summary: A language model adapted to tissue-engineering literature for exploring
  domain-specific text generation and research assistance.
facts: BioGPT fine-tune · Hugging Face · CC BY 4.0
role: Developer
methods: Causal language-model fine-tuning (Hugging Face Transformers)
licence: CC BY 4.0
bibtex: |-
  @misc{rafieyan2026tissuegpt,
    author    = {Rafieyan, Saeed},
    title     = {{TissueGPT}},
    year      = {2026},
    publisher = {Hugging Face},
    doi       = {10.57967/hf/8917},
    url       = {https://huggingface.co/Saeed/TissueGPT}
  }
links:
  model: https://huggingface.co/Saeed/TissueGPT
  dataset: https://huggingface.co/datasets/Saeed/TissueGPT_dataset
  doi: 10.57967/hf/8917
---

TissueGPT is a language model for tissue-engineering text. It is a fine-tuned version of Microsoft's [BioGPT](https://huggingface.co/microsoft/BioGPT), trained further on research articles (titles, abstracts and full texts) from the tissue-engineering literature.

### Intended uses

- Exploring summaries of biomedical and tissue-engineering papers
- Generating domain text, for example as a starting point for a background section
- Assisting research on scaffolds, the extracellular matrix (ECM) and related topics

It is a research tool, not for clinical use. Its generated text has not been independently evaluated for scientific accuracy, and like any language model it can produce fluent but wrong statements, so its output should always be checked by an expert.

### Training

Two rounds of fine-tuning with Hugging Face Transformers on an NVIDIA A100 80GB GPU: 3 epochs at a learning rate of 5e-5 (fp16), then 2 more at 3e-5 (bf16). Validation perplexity fell from 10.39 after the first round to 9.32 after the second.

### Try it

```python
from transformers import AutoTokenizer, AutoModelForCausalLM

tokenizer = AutoTokenizer.from_pretrained("Saeed/TissueGPT")
model = AutoModelForCausalLM.from_pretrained("Saeed/TissueGPT")

inputs = tokenizer("The extracellular matrix plays a critical role in tissue engineering because", return_tensors="pt")
output = model.generate(**inputs, max_length=50)
print(tokenizer.decode(output[0], skip_special_tokens=True))
```

The model and its training dataset are on [Hugging Face](https://huggingface.co/Saeed/TissueGPT) under CC BY 4.0, with the citable DOI [10.57967/hf/8917](https://doi.org/10.57967/hf/8917).
