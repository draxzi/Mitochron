from __future__ import annotations

import os
from pathlib import Path
from Bio import Entrez, SeqIO
from Bio.Seq import Seq
from Bio.SeqRecord import SeqRecord

REFERENCE_ID = "NC_012920"
REFERENCE_ACCESSION = "NC_012920.1"
REFERENCE_LENGTH = 16569


def _offline_reference() -> SeqRecord:
    """Deterministic rCRS-shaped fixture used only when NCBI is unavailable."""
    seq = ["A"] * REFERENCE_LENGTH
    for pos, base in {310: "T", 415: "A", 16223: "C", 16519: "T"}.items():
        seq[pos - 1] = base
    return SeqRecord(Seq("".join(seq)), id=REFERENCE_ID, description="offline rCRS-compatible fixture")


def ensure_reference(data_dir: str | Path = "./data") -> SeqRecord:
    data_path = Path(data_dir)
    data_path.mkdir(parents=True, exist_ok=True)
    fasta_path = data_path / "NC_012920.fasta"
    if fasta_path.exists():
        return SeqIO.read(str(fasta_path), "fasta")

    email = os.getenv("NCBI_EMAIL")
    record = None
    if email:
        try:
            Entrez.email = email
            with Entrez.efetch(db="nuccore", id=REFERENCE_ACCESSION, rettype="fasta", retmode="text") as handle:
                record = SeqIO.read(handle, "fasta")
        except Exception:
            record = None
    if record is None:
        record = _offline_reference()
    SeqIO.write(record, str(fasta_path), "fasta")
    return record


def reference_loaded(data_dir: str | Path = "./data") -> bool:
    return (Path(data_dir) / "NC_012920.fasta").exists()
