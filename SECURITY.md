# Security and privacy

Please do not report vulnerabilities by attaching real human genetic data or credentials. Remove sensitive data from reproductions and use synthetic FASTA fixtures whenever possible.

MITOCHRON's default session store is in-memory and intended for a controlled development or single-process deployment. Production deployments should add authenticated access controls, durable encrypted storage only when necessary, audit logging, network policy, and laboratory-approved data retention procedures. Never commit API keys, tokens, private genetic data, or personally identifiable information.
