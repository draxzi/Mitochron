# Forensic mtDNA Intelligence Dashboard

React + Vite + Tailwind frontend for the Phase 1 FastAPI backend.

## Run locally

```bash
cd /home/ubuntu/frontend
npm install
npm run dev
```

The dashboard uses `VITE_API_URL` and defaults to `https://mitochron.onrender.com` (set it to `http://localhost:8000` for local development). Start the backend first:

```bash
cd /home/ubuntu
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Use the NCBI tab to fetch a population cohort or upload one or more `.fasta`, `.fa`, or `.seq` files. Once a session is loaded, the dashboard enables Excel/CSV exports and the context-aware AI chat drawer.

Each browser tab keeps its own analysis result and access token in `sessionStorage`. The **New isolated session** control clears that tab only. Excel and CSV downloads use authenticated fetch requests rather than putting tokens in URLs. The PDF dossier is generated client-side and includes the reference genome, session metadata, summary metrics, cohort frequencies, and color-coded variant calls. Row-level **Ask AI** actions open the copilot with a contextual question for that exact call.
