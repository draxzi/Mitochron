from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

from .ai_copilot import ask_groq
from .analytics import clustering, summarize
from .exporter import csv_report, excel_report
from .ingestion import fetch_ncbi, parse_fasta
from .reference_manager import ensure_reference, reference_loaded
from .security import SlidingWindowLimiter, cleanup_sessions, create_session, require_session, sanitized_filename, validate_fasta_bytes
from .variant_caller import call_variants

load_dotenv()
DATA_DIR = Path(os.getenv("REFERENCE_DIR", str(Path(__file__).parent / "data")))
SESSIONS: dict[str, dict] = {}
REFERENCE = None
LIMITER = SlidingWindowLimiter()


def _origins() -> list[str]:
    configured = [item.strip() for item in os.getenv("ALLOWED_ORIGINS", "").split(",") if item.strip()]
    return sorted(set(["http://localhost:5173", "http://localhost:3000", *configured]))


@asynccontextmanager
async def lifespan(app: FastAPI):
    global REFERENCE
    REFERENCE = ensure_reference(DATA_DIR)
    yield


production = os.getenv("ENV", "development").lower() == "production"
app = FastAPI(title="Forensic mtDNA & SNP Analysis API", version="1.1.0", lifespan=lifespan, docs_url=None if production else "/docs", redoc_url=None if production else "/redoc")
app.add_middleware(CORSMiddleware, allow_origins=_origins(), allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type", "X-Session-Token"], allow_credentials=False)


@app.middleware("http")
async def security_and_limits(request: Request, call_next):
    cleanup_sessions(SESSIONS)
    path = request.url.path
    try:
        if path.startswith("/api/analyze/"):
            LIMITER.check(request, "analyze", 10)
        elif path == "/api/chat":
            LIMITER.check(request, "chat", 20)
    except HTTPException as exc:
        response = JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
    else:
        response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class NcbiRequest(StrictModel):
    query: str = Field(min_length=1, max_length=300)
    max_samples: int = Field(default=20, ge=15, le=100)
    region_label: str = Field(default="Unknown", max_length=32)


class ChatRequest(StrictModel):
    session_id: str = Field(min_length=1, max_length=64)
    message: str = Field(min_length=1, max_length=1000)


def _public_session(session: dict) -> dict:
    return {key: value for key, value in session.items() if key != "created_at_epoch"}


def _run(specimens: list[dict]) -> dict:
    if REFERENCE is None:
        raise HTTPException(503, "Reference genome is not loaded")
    variants = [variant for specimen in specimens for variant in call_variants(specimen, str(REFERENCE.seq))]
    result = {
        "specimens": [{key: value for key, value in specimen.items() if key != "sequence"} for specimen in specimens],
        "variants": variants,
    }
    result["summary"] = summarize(specimens, variants)
    result["clustering"] = clustering(specimens, variants)
    create_session(result, SESSIONS)
    return _public_session(result)


@app.get("/api/health")
def health():
    return {"status": "ok", "reference": "NC_012920", "reference_loaded": REFERENCE is not None and reference_loaded(DATA_DIR), "reference_length": len(REFERENCE.seq) if REFERENCE else 0}


@app.post("/api/analyze/ncbi")
def analyze_ncbi(request: NcbiRequest):
    try:
        specimens = fetch_ncbi(request.query, request.max_samples, request.region_label)
        if not specimens:
            raise HTTPException(404, "No NCBI records matched the query")
        return _run(specimens)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(502, f"NCBI ingestion failed: {exc}")


@app.post("/api/analyze/upload")
async def analyze_upload(files: Annotated[list[UploadFile], File(...)], region_label: Annotated[str, Form()] = "Unknown"):
    specimens = []
    if len(region_label) > 32:
        raise HTTPException(422, "region_label is too long")
    try:
        for upload in files:
            sanitized_filename(upload.filename)
            content = await upload.read(5 * 1024 * 1024 + 1)
            validate_fasta_bytes(content)
            remaining = 100 - len(specimens)
            if remaining <= 0:
                raise HTTPException(400, "A maximum of 100 FASTA records is allowed per request")
            parsed = parse_fasta(content, region_label if region_label != "Unknown" else None)
            specimens.extend(parsed[:remaining])
            if len(parsed) > remaining:
                raise HTTPException(400, "A maximum of 100 FASTA records is allowed per request")
        if not specimens:
            raise HTTPException(400, "No FASTA records were found")
        return _run(specimens)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(400, f"Upload parsing failed: {exc}")


def get_session(session_id: str, x_session_token: str | None = Header(default=None, alias="X-Session-Token")) -> dict:
    return require_session(session_id, SESSIONS, x_session_token)


@app.get("/api/export/{session_id}/excel")
def export_excel(session_id: str, session: dict = Depends(get_session)):
    return StreamingResponse(excel_report(session), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f'attachment; filename="mtDNA_{session_id}.xlsx"'})


@app.get("/api/export/{session_id}/csv")
def export_csv(session_id: str, session: dict = Depends(get_session)):
    return StreamingResponse(iter([csv_report(session).getvalue()]), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="mtDNA_{session_id}.csv"'})


@app.post("/api/chat")
def chat(request: ChatRequest, x_session_token: str | None = Header(default=None, alias="X-Session-Token")):
    session = require_session(request.session_id, SESSIONS, x_session_token)
    try:
        return {"session_id": request.session_id, "response": ask_groq(request.message, session["summary"])}
    except Exception as exc:
        raise HTTPException(502, f"Groq request failed: {exc}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)
