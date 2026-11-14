from __future__ import annotations

import io
import os
import re
from Bio import Entrez, SeqIO
from .security import MAX_FASTA_RECORDS, VALID_IUPAC

REGION_RE = re.compile(r"\b(NW|NE|SE|SW|North(?:west|east)?|South(?:west|east)?)\b", re.I)


def infer_region(text: str, default: str = "Unknown") -> str:
    match = REGION_RE.search(text or "")
    if not match:
        return default
    value = match.group(1).upper()
    return {"NORTHWEST": "NW", "NORTHEAST": "NE", "SOUTHWEST": "SW", "SOUTHEAST": "SE"}.get(value, value)


def _specimen(record, region_label: str | None = None) -> dict:
    sequence = str(record.seq).upper().replace(" ", "").replace("-", "")
    if not sequence or not set(sequence) <= (VALID_IUPAC - {"-"}):
        raise ValueError(f"Invalid IUPAC nucleotide sequence for {record.id}")
    return {"specimen_id": str(record.id), "region": region_label or infer_region(f"{record.id} {record.description}"), "title": str(record.description), "sequence": sequence}


def parse_fasta(content: bytes, region_label: str | None = None) -> list[dict]:
    handle = io.StringIO(content.decode("utf-8-sig"))
    records = list(SeqIO.parse(handle, "fasta"))
    if not records:
        raise ValueError("No FASTA records were found")
    if len(records) > MAX_FASTA_RECORDS:
        raise ValueError(f"A maximum of {MAX_FASTA_RECORDS} FASTA records is allowed per upload")
    return [_specimen(record, region_label) for record in records]


def fetch_ncbi(query: str, max_samples: int = 20, region_label: str | None = None) -> list[dict]:
    normalized_query = " ".join(query.split())
    if not normalized_query:
        raise ValueError("NCBI query cannot be empty")
    max_samples = max(15, min(int(max_samples), 100))
    email = os.getenv("NCBI_EMAIL")
    if not email:
        raise RuntimeError("NCBI_EMAIL is required for NCBI ingestion")
    Entrez.email = email
    Entrez.tool = "MITOCHRON"
    with Entrez.esearch(db="nuccore", term=normalized_query, retmax=max_samples, retmode="xml") as handle:
        ids = Entrez.read(handle).get("IdList", [])
    if not ids:
        return []
    with Entrez.efetch(db="nuccore", id=ids, rettype="fasta", retmode="text") as handle:
        records = list(SeqIO.parse(handle, "fasta"))
    if len(records) > MAX_FASTA_RECORDS:
        records = records[:MAX_FASTA_RECORDS]
    return [_specimen(record, region_label) for record in records]
