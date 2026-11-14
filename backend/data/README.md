# Runtime reference cache

`NC_012920.fasta` is intentionally not committed. The backend downloads and caches the human mitochondrial reference sequence `NC_012920.1` from NCBI RefSeq when `NCBI_EMAIL` is configured. The cache is runtime-generated and ignored by Git.

For offline tests without NCBI access, the existing test harness uses the backend's deterministic fixture fallback. That fallback is a test convenience and must not be presented as a validated replacement for the NCBI reference.
