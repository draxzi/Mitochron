# Forensic mtDNA & SNP Analysis Backend

FastAPI backend for reference-based human mitochondrial DNA analysis. It fetches and caches `NC_012920.1` when `NCBI_EMAIL` is configured; otherwise it creates a deterministic offline fixture so the pipeline can be tested immediately.

## Run

```bash
cd /home/ubuntu
python3 -m venv .venv && . .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

## Test without NCBI or Groq

```bash
python backend/test_pipeline.py
```

Endpoints: `GET /api/health`, `POST /api/analyze/ncbi`, `POST /api/analyze/upload`, `GET /api/export/{session_id}/excel`, `GET /api/export/{session_id}/csv`, and `POST /api/chat`.

Analysis responses include a per-tab `access_token`. Send it as `X-Session-Token` on export and chat requests. Tokens are required for session-scoped routes, expire after two hours, and active sessions are capped at 100. Uploads are limited to 5 MB, 100 FASTA records, and valid IUPAC nucleotide characters. Set `ALLOWED_ORIGINS` as a comma-separated list for additional frontend origins; set `ENV=production` to disable Swagger and ReDoc.

This is an analytical aid, not a validated forensic reporting system. Production use should add laboratory QC, chain-of-custody controls, reference validation, authentication, persistent storage, and independent scientific validation.
