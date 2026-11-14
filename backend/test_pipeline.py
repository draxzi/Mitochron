from __future__ import annotations
import io, sys
from unittest.mock import patch
from pathlib import Path
from fastapi.testclient import TestClient
sys.path.insert(0, str(Path(__file__).parent.parent))
from backend.main import app
from backend.reference_manager import ensure_reference


def make_sequence(changes: dict[int, str]) -> str:
    ref = list(str(ensure_reference(Path(__file__).parent / "data").seq))
    for pos, base in changes.items(): ref[pos - 1] = base
    return "".join(ref)


def main():
    records = [("sample_1_NW", {310: "C", 16223: "T"}), ("sample_2_NE", {310: "C", 16519: "C"}), ("sample_3_SE", {310: "C", 415: "W"}), ("sample_4_SW", {16223: "T", 16519: "C"}), ("sample_5_NW", {310: "C", 16223: "T", 16519: "C"})]
    fasta = "\n".join(f">{name}\n{make_sequence(changes)}" for name, changes in records).encode()
    with TestClient(app) as client:
        root = client.get("/")
        assert root.status_code == 200 and root.json() == {"status": "online", "service": "MITOCHRON Bio-Forensic API"}
        cors = client.options("/api/health", headers={"Origin": "https://mitochronai.vercel.app", "Access-Control-Request-Method": "GET"})
        assert cors.status_code == 200 and cors.headers.get("access-control-allow-origin") == "https://mitochronai.vercel.app"
        assert client.get("/api/health").status_code == 200
        response = client.post("/api/analyze/upload", files={"files": ("samples.fasta", io.BytesIO(fasta), "text/plain")}, data={"region_label": "Unknown"})
        assert response.status_code == 200, response.text
        result = response.json(); assert result["summary"]["total_specimens"] == 5
        freq = {x["base_change"]: x["frequency_pct"] for x in result["summary"]["frequencies"]}
        assert freq["310T>C"] == 80.0 and freq["16223C>T"] == 60.0 and freq["16519T>C"] == 60.0 and freq["415A>W"] == 20.0
        assert any(v["is_anomaly"] for v in result["variants"] if v["base_change"] == "415A>W")
        sid, token = result["session_id"], result["access_token"]
        assert client.get(f"/api/export/{sid}/excel").status_code == 403
        assert client.get(f"/api/export/{sid}/excel", headers={"X-Session-Token": "wrong-token"}).status_code == 403
        assert client.get(f"/api/export/{sid}/excel", headers={"X-Session-Token": token}).status_code == 200
        assert client.get(f"/api/export/{sid}/csv", headers={"X-Session-Token": token}).status_code == 200
        assert client.post("/api/chat", json={"session_id": sid, "message": "Explain anomalies"}).status_code == 403
        assert client.post("/api/chat", headers={"X-Session-Token": token}, json={"session_id": sid, "message": "Explain anomalies"}).status_code == 200
        assert client.post("/api/chat", json={"message": "What is a mitochondrial haplogroup?"}).status_code == 200
        with patch("backend.main.fetch_ncbi", return_value=[{"specimen_id": "mock_ncbi_1", "region": "NW", "title": "Mock NCBI record", "sequence": make_sequence({310: "C"})}]):
            ncbi = client.post("/api/analyze/ncbi", json={"query": "Homo sapiens mitochondrion complete genome India", "max_samples": 15, "region_label": "Unknown"})
            assert ncbi.status_code == 200 and ncbi.json()["summary"]["total_specimens"] == 1
        assert client.post("/api/analyze/upload", files={"files": ("payload.exe", io.BytesIO(fasta), "application/octet-stream")}).status_code == 400
        oversized = b">sample\n" + (b"A" * (5 * 1024 * 1024))
        assert client.post("/api/analyze/upload", files={"files": ("oversized.fasta", io.BytesIO(oversized), "text/plain")}).status_code == 413
        print("PASS: root/health, CORS, upload, mocked NCBI, variants, frequencies, anomaly flag, clustering, secured exports/chat, general chat, filename and size validation")
        print(f"Session: {sid}; variants: {len(result['variants'])}")

if __name__ == "__main__": main()
