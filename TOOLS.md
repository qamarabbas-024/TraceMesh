# TOOLS.md — Full OSINT Tool Catalog
*Two tiers: self-hosted (clonable, auto-updatable, runs in our infra) and external link/API (no repo — quick-link result or API wrapper). Both tiers appear in the registry and in aggregated results; only tier 1 goes through the container/edge execution pipeline.*

## Catalog sources (ingest these, don't hand-maintain a fixed list)
- `jivoi/awesome-osint` — the original, most actively maintained meta-list
- `edwardtay/awesome-OSINT` — 360+ tools, well-categorized by domain
- `Astrosp/Awesome-OSINT-List` — widest category breadth (per-platform social media, darknet, crypto, license plate/VIN)
- `brandonhimpfen/awesome-osint` — smaller, high-signal curation

Phase 10 (see PROGRESS.md) builds a parser that pulls structured entries from these on a schedule, tags each as Tier 1 or Tier 2 by whether it has a clonable repo, assigns domain/category from the list's own section headers, and inserts/updates registry rows automatically. New tools added to any of these four lists show up in your registry without a manual onboarding session. This is the actual mechanism for "all tools," not a fixed list.

---

## Tier 1 — Self-hosted (manual wrapper still required per tool; ingestion just finds them, doesn't wire them up automatically)

**Already seeded (v1.8):** Sherlock (username), Holehe (email), ExifTool (image)

**Username / social presence:** Maigret, WhatsMyName, Blackbird, Tookie (multi-platform username → social account finder)

**Email / breach:** h8mail, WhatBreach, theHarvester (dual: email + domain)

**Phone:** PhoneInfoga, ignorant

**Domain / subdomain / DNS:** Amass, Subfinder, Sublist3r, Metagoofil (metadata extraction from public documents on a domain)

**Geolocation / imagery:** OsintStalker (Facebook + geolocation), ReverseImageLocation (AI-powered geolocation from an image)

**Multi-domain frameworks (bigger lift, mine for modules rather than wholesale-integrating):**
- SpiderFoot — 200+ modules, email/phone/username/domain/breach in one framework
- Recon-ng — modular recon framework, good structural reference too
- **PRISM** — self-hosted, 22+ modules across domain/IP/email/phone/username, already outputs an entity graph + OPSEC score + PDF report — closest existing analog to this whole project; study its module structure directly
- GHunt — deep Google-account OSINT from an email

## Tier 2 — External link / API (no repo to clone; quick-link result or lightweight API wrapper)

**DNS / WHOIS / infrastructure:** WHOIS Lookup (ICANN), ViewDNS, DNSDumpster, Robtex, SecurityTrails (paid API), AbuseIPDB, ISP.Tools

**Network / device exposure:** Shodan (free-tier API), Censys (free-tier API)

**Reverse image:** TinEye

**Dark web:** Ahmia (Tor hidden-service search via clearnet), OnionLand

**Domain reputation / malware:** URLVoid, Netcraft Site Report, MetaDefender

Note: Tier 2 entries with a usable free API (Shodan, Censys, IPinfo, AbuseIPDB) get a thin wrapper and run inline with Tier 1 results. Tier 2 entries with *no* API (TinEye, WHOIS-via-web, ViewDNS) surface as a labeled outbound link in the aggregated result instead of a run — be upfront in the UI about which is which so the user isn't confused why one "tool" ran automatically and another just opens a new tab.

## Notes for onboarding any Tier 1 tool
- Confirm license (prefer MIT/Apache/GPL-compatible) and that it's still actively maintained — high star count is not the same as alive (Twint is the canonical dead-but-famous example)
- Docker-available tools (PhoneInfoga, SpiderFoot, PRISM) go straight to the container execution tier
- Every Tier 1 tool goes through the Result Normalizer before its output reaches the frontend — no exceptions
