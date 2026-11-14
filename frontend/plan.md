# Phase 2 frontend plan

## Direction

Three style options were considered: clinical instrument panel (0.06), editorial evidence archive (0.05), and nocturnal forensic operations desk (0.07). The chosen direction is the nocturnal forensic operations desk.

It uses slate/zinc surfaces, crimson as the signature evidence-review color, amber/emerald status accents, mono labels for machine output, and a quiet asymmetric composition instead of a generic centered grid. Interactions stay direct: ingestion is the first action, empty states explain the evidence workflow, and exports/chat appear only when a session exists.

## Structure

- `src/App.jsx`: session state, backend health, theme, and page composition.
- `src/IngestionPanel.jsx`: NCBI and FASTA ingestion forms.
- `src/DashboardOverview.jsx`: metrics, frequency chart/table, variant explorer, and clusters.
- `src/ExportToolbar.jsx`: Excel and CSV download links.
- `src/AIChatDrawer.jsx`: persistent session-aware chat drawer.
- `src/styles.css`: responsive visual system.

The app uses the existing FastAPI endpoints at `http://localhost:8000/api`, native fetch, Recharts, Lucide React, and Tailwind/PostCSS.
