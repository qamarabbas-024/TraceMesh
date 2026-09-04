# STIX 2.1 Threat Taxonomy & Entity Mapping

## 1. Overview
TraceMesh standardizes threat intelligence aggregation using OASIS STIX 2.1 specifications. This document defines the schema translation layers and entity relationships supported by the correlation engine.

## 2. Supported STIX Domain Objects (SDOs)
- `threat-actor`: Advanced persistent threat (APT) groups, cybercriminal syndicates.
- `malware`: C2 payloads, ransomware variants, infostealers.
- `indicator`: IP addresses, domain hashes, SSL certificate SHA-256 fingerprints.
- `observed-data`: Raw sensor observations from passive DNS and threat feeds.
- `identity`: Targeted organizations, industry sectors, geopolitical targets.

## 3. Relationship Matrix
TraceMesh uses directed graph edges:
- `threat-actor` -> `uses` -> `malware`
- `indicator` -> `indicates` -> `threat-actor`
- `threat-actor` -> `targets` -> `identity`
