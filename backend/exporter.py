from __future__ import annotations
from io import BytesIO, StringIO
import pandas as pd


def excel_report(result: dict) -> BytesIO:
    output = BytesIO()
    variants = pd.DataFrame(result.get("variants", []))
    frequencies = pd.DataFrame(result.get("summary", {}).get("frequencies", []))
    clusters = pd.DataFrame([{"specimen_id": s["specimen_id"], "region": s["region"], "mutation_count": sum(v["specimen_id"] == s["specimen_id"] for v in result.get("variants", [])), "cluster": result.get("clustering", {}).get("cluster_assignments", {}).get(s["specimen_id"], "")} for s in result.get("specimens", [])])
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        variants.to_excel(writer, sheet_name="Variant_Calls", index=False)
        frequencies.to_excel(writer, sheet_name="SNP_Frequencies", index=False)
        clusters.to_excel(writer, sheet_name="Specimen_Clusters", index=False)
    output.seek(0)
    return output


def csv_report(result: dict) -> StringIO:
    output = StringIO()
    pd.DataFrame(result.get("variants", [])).to_csv(output, index=False)
    output.seek(0)
    return output
