# Contributing to MITOCHRON

Thank you for contributing. Keep pull requests focused, reproducible, and explicit about whether a change affects scientific processing, API contracts, or presentation only.

Before opening a pull request, run `python3 backend/test_pipeline.py` and `npm --prefix frontend run build`. Do not commit `.env` files, credentials, private human genetic data, runtime reference caches, or generated build directories. Use synthetic fixtures or clearly licensed public data for tests.

Scientific changes should document the reference accession, alignment assumptions, variant representation, population-data provenance, and known limitations. UI changes should preserve session isolation and avoid presenting biogeographical signals as definitive identity or ancestry conclusions.
