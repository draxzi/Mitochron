from __future__ import annotations

from Bio.Align import PairwiseAligner

AMBIGUOUS = set("NWRYSMKBDHV")


def _effect(position: int, length: int, kind: str) -> str:
    dloop = position <= 576 or position >= 16024
    if dloop:
        return "Non-coding / D-Loop"
    return "Frameshift" if kind in {"Del", "Ins"} and length % 3 else "Coding Region Variant"


def _qv(base: str, exact: bool) -> int:
    if base.upper() in AMBIGUOUS:
        return 3
    return 40 if exact else 30


def call_variants(specimen: dict, reference: str) -> list[dict]:
    aligner = PairwiseAligner()
    aligner.mode = "global"
    aligner.match_score = 2
    aligner.mismatch_score = -3
    aligner.open_gap_score = -8
    aligner.extend_gap_score = -1
    alignment = aligner.align(reference, specimen["sequence"])[0]
    ref_aligned, query_aligned = str(alignment).splitlines()[-2:]
    # PairwiseAligner string output has spaces/labels in some versions; use aligned blocks instead.
    blocks_ref, blocks_query = alignment.aligned
    columns: list[tuple[str, str, int]] = []
    ref_cursor = 0
    q_cursor = 0
    for (r0, r1), (q0, q1) in zip(blocks_ref, blocks_query):
        while ref_cursor < r0:
            columns.append((reference[ref_cursor], "-", ref_cursor + 1)); ref_cursor += 1
        while q_cursor < q0:
            columns.append(("-", specimen["sequence"][q_cursor], ref_cursor + 1)); q_cursor += 1
        for rpos, qpos in zip(range(r0, r1), range(q0, q1)):
            columns.append((reference[rpos], specimen["sequence"][qpos], rpos + 1))
        ref_cursor, q_cursor = r1, q1
    while ref_cursor < len(reference):
        columns.append((reference[ref_cursor], "-", ref_cursor + 1)); ref_cursor += 1
    while q_cursor < len(specimen["sequence"]):
        columns.append(("-", specimen["sequence"][q_cursor], ref_cursor + 1)); q_cursor += 1

    calls = []
    i = 0
    while i < len(columns):
        ref_base, query_base, pos = columns[i]
        if ref_base == query_base:
            i += 1; continue
        if ref_base != "-" and query_base != "-":
            j = i
            while j < len(columns) and columns[j][0] != "-" and columns[j][1] != "-" and columns[j][0] != columns[j][1]: j += 1
            for k in range(i, j):
                rb, qb, p = columns[k]
                qv = _qv(qb, False)
                calls.append(_record(specimen, f"{p}{rb}>{qb}", p, 1, "Sub", qv))
            i = j; continue
        if ref_base == "-":
            inserted = []
            j = i
            while j < len(columns) and columns[j][0] == "-": inserted.append(columns[j][1]); j += 1
            anchor = max(1, pos - 1)
            calls.append(_record(specimen, f"{anchor}_{pos}ins{''.join(inserted)}", anchor, len(inserted), "Ins", _qv(inserted[0], False)))
            i = j; continue
        deleted = []
        j = i
        while j < len(columns) and columns[j][1] == "-": deleted.append(columns[j][0]); j += 1
        calls.append(_record(specimen, f"{pos}del{''.join(deleted)}", pos, len(deleted), "Del", 35))
        i = j
    return calls


def _record(specimen, change: str, position: int, length: int, kind: str, qv: int) -> dict:
    return {
        "specimen_id": specimen["specimen_id"], "region": specimen["region"], "base_change": change,
        "roi": "NC_012920", "position": int(position), "length": int(length), "type": kind,
        "qv_score": max(1, min(50, int(qv))), "effect": _effect(position, length, kind),
        "is_anomaly": qv < 15,
    }
