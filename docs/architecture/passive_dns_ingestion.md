# Passive DNS & Certificate Transparency Log Ingestion

## Pipeline Design
1. **CT Log Monitor**: Streams new certificates matching queried wildcard domains via Google / Cloudflare CT logs.
2. **DNS History Correlation**: Maps historic A/AAAA/MX/TXT records to correlate previous host environments.
3. **Subdomain Enumeration**: Integrates passive heuristics (crt.sh, DNS dumpster) with zero active traffic hitting target hosts.
