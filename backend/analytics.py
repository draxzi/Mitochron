from __future__ import annotations
from collections import Counter


def summarize(specimens: list[dict], variants: list[dict]) -> dict:
    total = len(specimens)
    counter = Counter(v["base_change"] for v in variants)
    frequencies = [{"base_change": key, "count": count, "total": total, "frequency_pct": round(count / total * 100, 2) if total else 0.0} for key, count in counter.most_common()]
    for row in frequencies:
        row["category"] = "Common" if row["frequency_pct"] >= 20 else "Rare/Unique"
    return {"total_specimens": total, "frequencies": frequencies, "common_variants": [x for x in frequencies if x["category"] == "Common"], "rare_unique_variants": [x for x in frequencies if x["category"] == "Rare/Unique"]}


def clustering(specimens: list[dict], variants: list[dict]) -> dict:
    ids = [s["specimen_id"] for s in specimens]
    mutation_sets = {sid: {v["base_change"] for v in variants if v["specimen_id"] == sid} for sid in ids}
    matrix = {a: {b: len(mutation_sets[a] ^ mutation_sets[b]) for b in ids} for a in ids}
    # Deterministic connected-component approximation to hierarchical clustering.
    unassigned = set(ids); groups = []
    while unassigned:
        seed = sorted(unassigned)[0]; group = {x for x in unassigned if matrix[seed][x] <= 1}
        unassigned -= group; groups.append(sorted(group))
    assignments = {sid: f"Cluster {i + 1}" for i, group in enumerate(groups) for sid in group}
    leaves = ",".join(f"{sid}:0" for sid in ids)
    return {"distance_matrix": matrix, "cluster_assignments": assignments, "tree": f"({leaves});", "clusters": [{"name": f"Cluster {i + 1}", "specimen_ids": group} for i, group in enumerate(groups)]}
