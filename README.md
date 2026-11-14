# MITOCHRON

> An open bioinformatics platform for mitochondrial DNA SNP analysis, sequence alignment, clustering, and biogeographical maternal lineage exploration.

## Overview

MITOCHRON combines a Python FastAPI analysis service with a React/Vite dashboard. It is designed to make reference-aligned mitochondrial DNA review more reproducible than manual sequence lookups and static forensic tables. The current implementation ingests NCBI records or user-supplied FASTA files, aligns specimens to the human revised Cambridge Reference Sequence (rCRS; RefSeq `NC_012920.1`), calls substitutions and simple indels, summarizes cohort frequencies, computes mutation-set distances and cluster assignments, and provides Excel, CSV, PDF, and AI-assisted explanation workflows.

MITOCHRON is an analytical aid and software starting point. It is not a validated forensic reporting system, a clinical diagnostic system, or an identity/ancestry determination service.

## Scientific motivation and scope

Mitochondrial DNA is maternally inherited and can support analysis of maternal lineage patterns. It represents only one inherited lineage and does not represent a person's complete genomic ancestry, identity, phenotype, or all population history. Geographic labels and population frequencies can describe the sampled cohort, but they must not be interpreted as definitive geographical ancestry or individual identification. Results depend on reference choice, sequencing quality, sample provenance, database coverage, and the representativeness of the comparison population.

The implemented workflow is intentionally conservative about interpretation: ambiguous bases receive low simulated quality scores, anomaly flags are surfaced for review, and the AI helper is instructed not to overstate ancestry or identification.

## Implemented functionality

### Data acquisition and provenance

The backend can query NCBI `nuccore` through Biopython Entrez when `NCBI_EMAIL` is configured. It fetches FASTA records and retains accession/title metadata. The reference manager downloads and caches `NC_012920.1` from NCBI RefSeq at runtime. The cache is ignored by Git because it is generated data, not source code. Uploaded FASTA/FA/SEQ/TXT files are parsed locally; upload size, filename, record count, encoding, and IUPAC nucleotide characters are validated.

Users are responsible for confirming that uploaded data may be processed and that specimen identifiers do not contain personally identifying or confidential information. Do not publish private human genetic data.

### Sequence processing and variant calling

Each specimen is aligned globally to the loaded reference with Biopython `Bio.Align.PairwiseAligner`. The current caller reports substitutions, insertions, and deletions against one-based rCRS coordinates. Each call contains specimen ID, region tag, reference ROI, position, length, type, base change, quality score, effect classification, and anomaly status. D-loop positions are labelled as non-coding/D-Loop; coding-region indels can be labelled frameshift when their length is not divisible by three.

Quality values are simulated or alignment-derived approximations for this Phase 1 implementation. They are not instrument quality scores and should not substitute for laboratory QC, read-level evidence, or validated thresholds.

### Cohort frequencies and clustering

The analytics module counts exact mutation strings across the active specimen cohort and reports count, total, percentage, and common/rare classification. Pairwise distances are calculated from symmetric differences between specimen mutation sets. Current cluster output uses a deterministic connected-component approximation based on mutation-set distance and returns assignments plus a simple tree string suitable for dashboard visualization. It is not a validated phylogenetic inference pipeline.

### NCBI and BLAST status

NCBI Entrez retrieval is implemented. A BLAST workflow is not implemented in the current repository; no BLAST results are fabricated or implied. Future work may add an explicit, provenance-preserving BLAST integration with documented database version, parameters, and result retention.

### Haplogroup status

Automated haplogroup identification is not implemented. The dashboard displays variants and clusters, but it does not assign haplogroups or make maternal-lineage conclusions.

## Architecture

```text
mitochron/
├── backend/
│   ├── main.py                 FastAPI routes, CORS, headers, rate limiting
│   ├── security.py             Token isolation, TTL cleanup, upload validation
│   ├── reference_manager.py    NCBI reference fetch and runtime cache
│   ├── ingestion.py            NCBI and FASTA ingestion
│   ├── variant_caller.py       Pairwise alignment and variant records
│   ├── analytics.py            Frequencies, distances, clusters
│   ├── exporter.py             Excel and CSV reports
│   ├── ai_copilot.py           Optional Groq context helper with guardrails
│   ├── test_pipeline.py        Offline integration and security tests
│   └── data/                   Runtime reference-cache location
├── frontend/
│   ├── src/App.jsx             Session state and application shell
│   ├── src/IngestionPanel.jsx  NCBI and FASTA workflows
│   ├── src/DashboardOverview.jsx Charts, tables, clusters, row AI actions
│   ├── src/DnaHelixHero.jsx    Canvas hero visualization
│   ├── src/ExportToolbar.jsx   Authenticated Excel/CSV and PDF dossier export
│   └── src/AIChatDrawer.jsx    Token-authenticated forensic assistant UI
├── .env.example
├── .gitignore
├── CONTRIBUTING.md
├── SECURITY.md
└── LICENSE-RECOMMENDATION.md
```

## Technology stack

The backend uses Python 3.10+, FastAPI, Uvicorn, Biopython, pandas, NumPy, SciPy, openpyxl, python-dotenv, and python-multipart. The frontend uses React, Vite, Tailwind CSS, Recharts, Lucide React, jsPDF, and jspdf-autotable. The in-memory session model uses per-session high-entropy tokens stored in browser `sessionStorage` and sent through `X-Session-Token`.

## Installation

```bash
git clone <your-github-url>/mitochron.git
cd mitochron
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install -r backend/requirements.txt
npm --prefix frontend install
cp .env.example .env
cp frontend/.env.example frontend/.env
```

Set `NCBI_EMAIL` before using live NCBI retrieval. `GROQ_API_KEY` is optional; without it, the copilot returns a local explanatory fallback. Never expose private keys through `frontend/.env`; Vite variables are browser-visible.

## Running the application

Start the backend from the repository root:

```bash
. .venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Start the frontend in a second terminal:

```bash
npm --prefix frontend run dev
```

The development dashboard defaults to `http://localhost:5173` and calls the Render API origin `https://mitochron.onrender.com`. Set `VITE_API_URL` to point at another API origin (for local development, use `http://localhost:8000`). In production, set `ENV=production` for the backend to disable interactive API documentation and configure `ALLOWED_ORIGINS` explicitly. The API root `GET /` is also used for Render wake-up checks.

## Example workflow

1. Start the backend and dashboard.
2. Upload a synthetic or authorized FASTA cohort, or configure `NCBI_EMAIL` and query NCBI.
3. Review reference-aligned calls, QV/anomaly flags, cohort frequencies, and cluster assignments.
4. Use authenticated Excel/CSV exports or the styled PDF dossier for a session summary.
5. Ask the copilot about a specific call only after reviewing the underlying evidence.
6. Clear the browser tab's isolated session before handing off the workstation.

## Testing and quality checks

Run the backend integration and security checks:

```bash
python3 backend/test_pipeline.py
```

Run the frontend production build:

```bash
npm --prefix frontend run build
```

The test suite covers health, upload parsing, variant/frequency calculations, anomaly flags, clustering, token-protected exports/chat, invalid filenames, and oversized payload rejection. It uses deterministic fixtures when NCBI is unavailable; those fixtures are test conveniences, not scientific validation datasets.

## Security and privacy

Session-scoped exports and chat require the matching `X-Session-Token`. Sessions expire after two hours and are capped at 100 in memory. The backend adds common security headers, explicit CORS origins, route rate limits, strict upload validation, and prompt-injection guardrails. These are defense-in-depth measures, not a complete production security review.

Do not upload or publish identifiable human genetic data. For a production laboratory deployment, add authenticated users, encrypted persistence only where necessary, audit trails, retention/deletion policies, network controls, validated QC procedures, and an independent security review.

## Known limitations and future development

Current limitations include in-memory sessions, no user accounts, no persistent audit log, no BLAST implementation, no haplogroup assignment, simplified clustering, simulated QV values, no raw-read or chromatogram interpretation, and no independent forensic validation. Population frequency outputs are only as representative as the active cohort and database source.

Future work could add validated read-level QC, explicit BLAST provenance, haplogroup reference trees, robust phylogenetic algorithms, persistent encrypted projects, authenticated laboratory roles, chain-of-custody records, versioned population datasets, benchmark fixtures, and independent scientific validation.

## Scientific references and provenance

- NCBI RefSeq, human mitochondrial reference accession `NC_012920.1`: https://www.ncbi.nlm.nih.gov/nuccore/NC_012920.1
- NCBI Entrez Programming Utilities documentation: https://www.ncbi.nlm.nih.gov/books/NBK25501/
- Biopython documentation, including Entrez and alignment APIs: https://biopython.org/docs/
- MITOMAP, a public mitochondrial DNA variation resource: https://www.mitomap.org/

These links document the external resources used or relevant to the implementation. They do not constitute a validation claim for MITOCHRON.

## Licensing

No license is asserted in this repository because authorship and licensing authority were not provided. Review [`LICENSE-RECOMMENDATION.md`](LICENSE-RECOMMENDATION.md) before adding a license.
