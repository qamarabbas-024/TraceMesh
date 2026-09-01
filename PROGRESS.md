# PROGRESS.md — Live Roadmap & Session Tracker
*Read AGENTS.md first for the rules — especially Section 0 (mission directive) and Section 4 (one version per session). This file tracks where the project actually is. TOOLS.md holds the full tool catalog Phase 10 pulls from.*

**CURRENT VERSION: v19.3 — done (Phase 30: Automated OSINT Scheduled Watchdog Daemon Complete)**

Update the line above at the end of every session. That single line is the source of truth for "what do I build next."

---

## Phase 1 — Skeleton (v1.0–v1.6)
- [x] 1.0 — Init monorepo (pnpm workspaces), NestJS backend + Next.js frontend, shared tsconfig
- [x] 1.1 — Docker Compose (Postgres + Redis), `.env.example`, README setup steps
- [x] 1.2 — Prisma schema v1: `User`, `Tool` tables, first migration
- [x] 1.3 — Backend health-check endpoint
- [x] 1.4 — Frontend blank page confirming backend connection
- [x] 1.5 — CI (GitHub Actions): install, lint, build
- [x] 1.6 — Dark-first theme tokens in Tailwind config (no components yet)

## Phase 2 — Tool Registry, multi-domain from the start (v1.7–v1.13)
- [x] 1.7 — Extend `Tool` schema: `input_type[]` (email/username/phone/image/domain/ip), category, source repo URL, execution type, input schema, tracked version, license, maintenance-status flag
- [x] 1.8 — Seed 3 tools across 3 domains: **Sherlock** (username), **Holehe** (email), **ExifTool** (image) — see TOOLS.md
- [x] 1.9 — `GET /tools` endpoint
- [x] 1.10 — `GET /tools/:id` endpoint
- [x] 1.11 — Frontend: input box + auto-detected/selectable input type + matching tool list (flat, checkboxes)
- [x] 1.12 — "Select All" + per-tool selection state
- [x] 1.13 — Admin `POST /tools` endpoint

## Phase 3 — First real execution + Aggregation Engine v1 (v1.14–v1.22)
- [x] 1.14 — Wire Holehe as an edge function (simplest of the three)
- [x] 1.15 — `POST /run-batch` — accepts input + selected tool IDs, launches all in parallel
- [x] 1.16 — Result Normalizer v1: map one tool's output into `{status, summary, entities[]}`
- [x] 1.17 — Aggregation Engine v1: merge multiple tools' normalized entities into one result list, tag each entity with source tool
- [x] 1.18 — Frontend: submit, per-tool loading state, live results as each tool finishes
- [x] 1.19 — Add Sherlock (username domain) — proves the pattern generalizes across domains
- [x] 1.20 — Add ExifTool (image domain, first file-upload input type)
- [x] 1.21 — Per-tool timeout so one slow tool doesn't block the batch
- [x] 1.22 — Result cache keyed on `(input, tool)` pair

**Milestone: v1.22 — first real working MVP across 3 domains.**

## Phase 4 — Accounts (v1.23–v1.27)
- [x] 1.23 — Auth (signup/login/sessions)
- [x] 1.24 — Protect run endpoints behind auth
- [x] 1.25 — Run history table per user
- [x] 1.26 — History page (list past runs)
- [x] 1.27 — Re-open a past result without re-running

## Phase 5 — Export v1 (v1.28–v1.31)
- [x] 1.28 — CSV export of one result
- [x] 1.29 — JSON export of one result
- [x] 1.30 — Playwright headless PDF proof-of-concept
- [x] 1.31 — Wire PDF pipeline to a real aggregated result

**Milestone: v1.31 — feature-complete flat beta.**

---

## Phase 6 — 3D Shell: the Entity Graph Globe (v2.0–v2.7)
- [x] 2.0 — Static particle/wireframe sphere rendered behind the existing flat UI, ambient idle rotation only (this is the signature visual — see AGENTS.md Section 3)
- [x] 2.1 — Tool list rendered as HUD-style cards around/near the globe (still using flat click handlers underneath)
- [x] 2.2 — Loading state: particles scatter on search submit, converge to form the globe as first tool finishes
- [x] 2.3 — As each tool completes, its discovered nodes pulse into place on the globe surface
- [x] 2.4 — Hover/click node on globe highlights that node, shows label + source tool
- [x] 2.5 — Click node on globe triggers fan-out search (populates input, updates tool list to matching types)
- [x] 2.6 — Global reduce-motion toggle: stops rotation, simplifies node entrance, instant transitions
- [x] 2.7 — Edge cases: 0 results (empty globe state), 100+ nodes (clustering/lod), narrow viewports

**Milestone: v2.7 — the 3D entity globe is alive and load-bearing.**

---

## Phase 7 — Automated Tool Registry Ingestion (v3.0–v3.4)
- [x] 3.0 — Catalog parsers for awesome-osint repositories
- [x] 3.1 — Daily catalog update cron job
- [x] 3.2 — Admin UI: catalog viewer with 1-click onboard button
- [x] 3.3 — Auto-detect tool repo updates via GitHub Releases API
- [x] 3.4 — One-click redeploy for updated tools

---

## Phase 8 — Heavy Tool Execution Pipeline: Docker Runner (v3.5–v3.8)
- [x] 3.5 — Docker-in-Docker job runner sandbox
- [x] 3.6 — BullMQ execution queue with Redis
- [x] 3.7 — Stream live stdout from container to UI via SSE
- [x] 3.8 — Auto-teardown container on completion/timeout

---

## Phase 9 — Onboard First Wave of Tools (v4.0–v4.8)
- [x] 4.0 — Maigret (username)
- [x] 4.1 — WhatsMyName (username)
- [x] 4.2 — GHunt (email / Google)
- [x] 4.3 — h8mail (email / breach)
- [x] 4.4 — PhoneInfoga (phone)
- [x] 4.5 — Subfinder (domain)
- [x] 4.6 — SpiderFoot (multi-domain framework)
- [x] 4.7 — theHarvester (email + domain)
- [x] 4.8 — Censys + Shodan API wrappers

---

## Phase 10 — Entity Graph Intelligence Layer (v5.0–v5.4)
- [x] 5.0 — Deduplication engine (fuzzy match, aliases)
- [x] 5.1 — Cross-tool correlation (flag when 2+ tools discover the same entity)
- [x] 5.2 — Confidence scoring per entity
- [x] 5.3 — Auto-suggest next searches based on graph shape
- [x] 5.4 — Graph export (Gephi GEXF, GraphML)

---

## Phase 11 — Investigation Workspaces & Dossiers (v5.5–v5.9)
- [x] 5.5 — Case/investigation entity in DB
- [x] 5.6 — Pin results from multiple searches into one case graph
- [x] 5.7 — Add analyst notes to any node/edge
- [x] 5.8 — Multi-search aggregated PDF dossier export
- [x] 5.9 — Workspace sharing (read-only link with token)

---

## Phase 17 — Dual-Mode Visualizer & Enterprise Threat Formats (v6.0)
- [x] 6.0 — Dual-mode graph visualizer: seamless toggle between 3D Holographic Globe and 2D Tactical Force-Directed Graph
- [x] 6.1 — Interactive HUD camera controls: zoom in/out, pan, reset coordinates, raycasting node selection
- [x] 6.2 — STIX 2.1 Cyber Threat Intelligence JSON bundle exporter
- [x] 6.3 — MISP (Malware Information Sharing Platform) Event JSON exporter
- [x] 6.4 — Maltego Graph Transform CSV exporter
- [x] 6.5 — Node inspector popover with live entity confidence, source tool branding, and 1-click fan-out search

---

## Phase 18 — Sci-Fi Command-Center HUD 3D Dashboard (v7.1–v8.0)
- [x] 7.1 — Canvas scanlines overlay, UTC mission clock, and live telemetry bar
- [x] 7.2 — Multi-layer 3D holographic globe with atmospheric volumetric glow and vector pulse beams
- [x] 7.3 — 2D tactical force-directed spring physics engine with Coulomb repulsion
- [x] 7.4 — Floating holographic command bar with lock-on reticle and auto-detect regex
- [x] 7.5 — Canvas animated radial OPSEC dials and threat matrix telemetry
- [x] 7.6 — Sci-Fi modular tool cards with execution waveforms and favorite pinning
- [x] 7.7 — Glassmorphism cyber entity inspector drawer with syntax-highlighted raw JSON explorer
- [x] 7.8 — Real-time OSINT threat activity stream ticker and memory load monitor
- [x] 7.9 — Tactical case manager drawer and target evidence pinboard
- [x] 8.0 — Procedural Web Audio API sound synthesizer and tactical hotkeys modal

---

## Phase 19 — Next-Gen 3D Holographic & Animation Engine (v8.1–v9.0)
- [x] 8.1 — 3D constellation geo-mesh with geodesic latitude rings and polar orbiting recon satellites
- [x] 8.2 — 3D card gyroscope parallax tilt (`useParallaxTilt`) with specular sheen reflections
- [x] 8.3 — Terminal matrix character-scramble cyber decryption text effect (`DecryptText`)
- [x] 8.4 — Interactive tactical theme switcher with real-time CSS variable palette morphing
- [x] 8.5 — 3D perspective cyber grid floor with rising ambient particle field (`CyberGrid3D`)
- [x] 8.6 — Real-time Web Audio and RF signal frequency spectrum visualizer (`AudioSpectrum`)
- [x] 8.7 — Staggered node wave emergence in entity correlation graph with threat hazard beacons
- [x] 8.8 — Rotating 3D lock-on reticle with crosshair target brackets and rangefinder
- [x] 8.9 — Multi-target cross-correlation matrix and pivot intersection engine (`ComparisonMatrix`)
- [x] 9.0 — Tab visibility 0-overhead frame throttle, full accessibility compliance, and release verification

---

## Phase 20 — Autonomous Multi-Hop Recursive Reconnaissance Engine (v9.3)
- [x] 9.1 — Client-side hydration discrepancies resolved and SSR lifecycle guards implemented
- [x] 9.2 — Live OPSEC data redaction mode with real-time PII masking & sanitized env template
- [x] 9.3 — BFS Autonomous Multi-Hop Recursive Discovery Engine (`deepRecon: true`, `maxHops: 1-3`), concentric orbital 3D/2D graph topology, and hierarchical parent-child vector routing

---

## Phase 21 — Next-Wave OSINT Resolvers, Live RDAP/WHOIS Engine & Geolocation Threat Map (v10.0)
- [x] 10.0 — Live RDAP/WHOIS domain & IP registrant inspector (`rdap_whois`), Blackbird social footprint runner (`blackbird`), Ignorant phone probe (`ignorant_phone`), and OnionLand darknet engine (`onionland`)
- [x] 10.1 — Tactical Geolocation World Map HUD drawer (`GeoThreatMap.tsx`, Hotkey `G`) plotting server coordinates and EXIF GPS tags
- [x] 10.2 — Chronological Incident & Registration Threat Timeline (`ThreatTimeline.tsx`, Hotkey `T`) with domain lifecycle and breach history tracking

---

## Phase 22 — Advanced Cyber Threat Feeds, TLS Handshake Inspector & 100% Real OSINT Network Engine (v11.0)
- [x] 11.0 — Abuse.ch ThreatFox live malware payload & botnet C2 IOC scanner (`threatfox_ioc`)
- [x] 11.1 — Direct TLS 1.3 socket handshake certificate deep inspector (`ssl_inspector`) for Subject Alternative Names (SANs) and CA chain extraction
- [x] 11.2 — 100% Real network probes across Sherlock, Blackbird, Holehe, DomainRecon, Subfinder, IPinfo, and Ahmia with zero synthetic modulo fallbacks

---

## Phase 24 — TraceMesh OSINT Expansion v2.0 & Cyberpunk Dashboard HUD (v13.0 - v13.2)
- [x] 13.0 — Interactive Cyberpunk OSINT Dashboard HUD (`dashboard.html`) with dark/light themes, keyboard shortcuts (`⌘K`), quick-action target selectors, live WebSocket streaming, and source health monitors.
- [x] 13.1 — Unified Investigation API & Multi-Format Exporter Gateway (`/api/investigate/*`, `/api/export/*`, `/api/diagnostics`, `/api/monitor/*`).
- [x] 13.2 — End-to-end 16-suite verification covering auto-detect input parsing, STIX 2.1, MISP, PDF, CSV, XLSX, SQLite investigations database, and real-time WebSocket telemetry.

---

## Phase 25 — Advanced Threat Intelligence & Graph Analytics (v14.0–v14.5)
- [x] 14.0 — Darknet Onion Hunter (`AhmiaTorEngine` deep crawler for hidden services)
- [x] 14.1 — Subdomain DNS Brute-Forcer & CNAME Takeover Scanner (`DNSBruteTakeover`)
- [x] 14.2 — OpenPGP / GPG Key Server Keyring Correlator (`GPGKeyringOSINT`)
- [x] 14.3 — Autonomous Graph Centrality & Community Detection (PageRank & Betweenness Centrality)
- [x] 14.4 — Autonomous MITRE ATT&CK Tactics Mapper (`MitreAttackMapper`)
- [x] 14.5 — Investigation Case Tagging & Entity Timeline Filtering


## Phase 26 — Cloud & Infrastructure Reconnaissance (v15.0–v15.5)
- [x] 15.0 — Cloud Bucket & Public Blob Discovery (AWS S3, GCP Cloud Storage, Azure Blob Scanner)
- [x] 15.1 — HTTP Security Headers & TLS Cipher Suite Auditor
- [x] 15.2 — BGP Route & Autonomous System (ASN) Peering Graph (`ASNPeeringGraph`)
- [x] 15.3 — Threat Actor & APT Attribution Engine
- [x] 15.4 — Reverse Favicon & MMH3 Hash Shodan Searcher
- [x] 15.5 — Real-time IOC Graph Clustering & Threat Feed Syncer

---

## Phase 27 — Deep Web, Social & Identity Intelligence (v16.0–v16.5)
- [x] 16.0 — Darknet Marketplace & Forum Keyword Scraper (`DarknetForumHunter`)
- [x] 16.1 — Gravatar & Avatar Reverse Hash Correlator (MD5/SHA256 Profile Unmasker)
- [x] 16.2 — GitHub Secret Scanning & Public Commit Crawler (`GitHubCommitCrawler`)
- [x] 16.3 — Pastebin & Leak Site Dork Crawler (`PasteDumpMonitor`)
- [x] 16.4 — Multi-Platform Username Phonetic & Levenshtein Variant Generator (`UsernameFuzzer`)
- [x] 16.5 — Cross-Platform Social Graph Pivot Visualizer & Dossier Summary

---

## Phase 28 — Cryptographic & Financial Intelligence (v17.0–v17.5)
- [x] 17.0 — Multi-Chain Crypto Transaction Flow Graph (BTC, ETH, Solana, USDT)
- [x] 17.1 — OFAC Sanctions & AML Blacklist Address Screener
- [x] 17.2 — Smart Contract Token Holder & Transfer Graph
- [x] 17.3 — ENS & Unstoppable Domains Reverse Resolver
- [x] 17.4 — Decentralized Web IPFS / Arweave Content Mirror Resolver
- [x] 17.5 — High-Risk Cryptocurrency Cluster Tagging

---

## Phase 29 — Advanced OPSEC & Defensive Countermeasures (v18.0–v18.5)
- [x] 18.0 — Multi-Hop Proxy & Tor Circuit Router Simulator
- [x] 18.1 — Anti-Canary Token & Honeypot Detector
- [x] 18.2 — Browser Fingerprint Defeater & User-Agent Rotator
- [x] 18.3 — Tactical Evidence Preservation & Cryptographic Hash Timestamper (SHA-256 / Merkle Proof)
- [x] 18.4 — Zero-Knowledge Analyst Notes Encryption
- [x] 18.5 — Automated Red Team Risk Scoring & Attack Surface Rating

---

## Phase 30 — Automated Intelligence Synthesis & Reporting (v19.0–v19.5)
- [x] 19.0 — Executive Threat Brief Generator (HTML5 / Standalone Interactive Dossier)
- [x] 19.1 — CybOX 2.1 & OpenCTI STIX Connector
- [x] 19.2 — Real-time Multi-Analyst Collaboration Hub & Live Graph Sync
- [x] 19.3 — Automated OSINT Scheduled Watchdog Daemon
- [ ] 19.4 — Global Entity Pivot Search Matrix
- [ ] 19.5 — Full System Integration Verification & Final Roadmap Certification


