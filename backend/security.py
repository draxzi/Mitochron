from __future__ import annotations

import re
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import Depends, Header, HTTPException, Request

SESSION_TTL_SECONDS = 7200
MAX_SESSIONS = 100
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_FASTA_RECORDS = 100
VALID_IUPAC = set("ATGCNWRYSKMBDHV-")
SAFE_FILENAME = re.compile(r"^[A-Za-z0-9._-]+$")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def new_access_token() -> str:
    return secrets.token_urlsafe(32)


def cleanup_sessions(sessions: dict[str, dict[str, Any]]) -> None:
    cutoff = time.time() - SESSION_TTL_SECONDS
    expired = [sid for sid, item in sessions.items() if item.get("created_at_epoch", 0) < cutoff]
    for sid in expired:
        sessions.pop(sid, None)
    while len(sessions) > MAX_SESSIONS:
        oldest = min(sessions, key=lambda sid: sessions[sid].get("created_at_epoch", 0))
        sessions.pop(oldest, None)


def create_session(result: dict[str, Any], sessions: dict[str, dict[str, Any]]) -> tuple[str, str]:
    cleanup_sessions(sessions)
    session_id = __import__("uuid").uuid4().hex
    access_token = new_access_token()
    result["session_id"] = session_id
    result["access_token"] = access_token
    result["created_at"] = now_utc().isoformat()
    result["created_at_epoch"] = time.time()
    sessions[session_id] = result
    cleanup_sessions(sessions)
    return session_id, access_token


def require_session(
    session_id: str,
    sessions: dict[str, dict[str, Any]],
    x_session_token: str | None,
) -> dict[str, Any]:
    cleanup_sessions(sessions)
    session = sessions.get(session_id)
    if not session or not x_session_token or not secrets.compare_digest(str(session.get("access_token", "")), x_session_token):
        raise HTTPException(status_code=403, detail="Forbidden")
    return session


def session_dependency(sessions: dict[str, dict[str, Any]]):
    def dependency(session_id: str, x_session_token: str | None = Header(default=None, alias="X-Session-Token")):
        return require_session(session_id, sessions, x_session_token)
    return dependency


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self.events: dict[tuple[str, str], deque[float]] = defaultdict(deque)

    def check(self, request: Request, bucket: str, limit: int, window: int = 60) -> None:
        ip = request.client.host if request.client else "unknown"
        key = (ip, bucket)
        now = time.monotonic()
        events = self.events[key]
        while events and events[0] <= now - window:
            events.popleft()
        if len(events) >= limit:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        events.append(now)


def sanitized_filename(filename: str | None) -> str:
    name = Path(filename or "").name
    if not name or not SAFE_FILENAME.fullmatch(name):
        raise HTTPException(status_code=400, detail="Invalid filename")
    extension = Path(name).suffix.lower()
    if extension not in {".fasta", ".fa", ".seq", ".txt"}:
        raise HTTPException(status_code=400, detail="Only .fasta, .fa, .seq, and .txt files are supported")
    return name


def validate_fasta_bytes(content: bytes) -> None:
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Uploaded file exceeds the 5 MB limit")
    if b"\x00" in content:
        raise HTTPException(status_code=400, detail="Binary or null-byte content is not allowed")
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="FASTA must be valid UTF-8 text") from exc
    sequence_lines = [line.strip().replace(" ", "").upper() for line in text.splitlines() if line.strip() and not line.lstrip().startswith(">")]
    if not sequence_lines or any(not set(line) <= VALID_IUPAC for line in sequence_lines):
        raise HTTPException(status_code=400, detail="FASTA contains invalid IUPAC nucleotide characters")
