# PROGRESS.md — Live Roadmap & Session Tracker
*Read AGENTS.md first for the rules — especially Section 0 (mission directive) and Section 4 (one version per session). This file tracks where the project actually is. TOOLS.md holds the full tool catalog Phase 10 pulls from.*

**CURRENT VERSION: v6.0 — done (Phase 17 Dual-Mode Visualizer & STIX2/MISP/Maltego Complete)**

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
- [x] 2.2 — Cards directly clickable/hoverable via raycasting, remove flat list
- [x] 2.3 — Camera orbit/pan controls around the globe
- [x] 2.4 — Loading-state motion redesign: globe assembling from scattered particles into a sphere as the platform initializes
- [x] 2.5 — Reduce-motion toggle wired to every animation so far, including globe idle rotation
- [x] 2.6 — Translucent glass HUD panels (cyan-glow borders per design system) for forms/results over the 3D scene
- [x] 2.7 — Keyboard navigation through the HUD interface

## Phase 7 — Update Checker Engine (v2.8–v2.13)
- [x] 2.8 — `lastCheckedCommit` field on `Tool`
- [x] 2.9 — Cron job checks one tool's repo for new commit/tag
- [x] 2.10 — Store + expose update-available flag
- [x] 2.11 — Frontend update-available badge (amber accent, per design system) on tool card
- [x] 2.12 — Extend cron to all registered tools
- [x] 2.13 — "Update now" action (re-pull + redeploy)

## Phase 8 — Entity Graph Goes Live (v2.14–v2.19)
*This is where the globe stops being decorative and becomes the actual product visualization.*
- [x] 2.14 — Search root node renders at sphere center/prominent surface position
- [x] 2.15 — Discovered entities render as child nodes around root on the globe
- [x] 2.16 — Animated edges draw from root to each child on result-ready
- [x] 2.17 — Entity nodes color-coded by source tool
- [x] 2.18 — Click entity node on globe → popover with details (value, source tool, confidence, raw data snippet) + "Search this entity" action
- [x] 2.19 — Click "Search this entity" → triggers fan-out search (new root, previous graph stays as parent layer)

---

## Phase 9 — Multi-Domain Hardening (v3.0–v3.5)
- [x] 3.0 — Phone number domain onboarding (PhoneInfoga runner & validator)
- [x] 3.1 — Domain/IP lookup onboarding (Amass / DNS / Shodan-style passive runner & validator)
- [x] 3.2 — Reverse image search onboarding (ExifTool metadata & optical signature runner)
- [x] 3.3 — Cross-domain correlation logic in Aggregation Engine (email → username → platforms, IP → domain)
- [x] 3.4 — Batch comparison view (compare two past runs)
- [x] 3.5 — Domain-switcher quick filter on frontend

---


## Phase 10 — Catalog Ingestion + Full Tool Onboarding (v3.4–v3.22)
*Pull from TOOLS.md. Two-tier model: Tier 1 (self-hosted, clonable) gets a real wrapper + normalizer; Tier 2 (external link/API) gets a thin API wrapper or a labeled outbound link. Re-check each Tier 1 tool is still maintained right before onboarding it.*

**Ingestion pipeline (build this before manually onboarding more tools — it's what makes "all tools" actually true instead of a fixed list)**
- [ ] 3.4 — Parser for `jivoi/awesome-osint` markdown → structured entries (name, domain, description, repo link if present)
- [ ] 3.5 — Extend parser to the other 3 meta-lists (`edwardtay`, `Astrosp`, `brandonhimpfen`), dedupe overlapping entries
- [ ] 3.6 — Tier classifier: has a clonable repo → Tier 1 candidate; otherwise → Tier 2
- [ ] 3.7 — Auto-insert parsed entries into the registry as `unverified` — visible to admin for review, not yet live to users
- [ ] 3.8 — Scheduled re-run (weekly) so new entries in the source lists flow in automatically
- [ ] 3.9 — Admin review UI: approve/reject unverified entries, promote to live

**Username / social presence**
- [ ] 3.10 — Onboard **Maigret**
- [ ] 3.11 — Onboard **WhatsMyName**
- [ ] 3.12 — Onboard **Blackbird**
- [ ] 3.13 — Onboard **Tookie**

**Email / breach**
- [ ] 3.14 — Onboard **h8mail**
- [ ] 3.15 — Onboard **WhatBreach**
- [ ] 3.16 — Onboard **theHarvester**

**Phone**
- [ ] 3.17 — Onboard **ignorant**

**Domain / subdomain / DNS**
- [ ] 3.18 — Onboard **Amass**
- [ ] 3.19 — Onboard **Subfinder**
- [ ] 3.20 — Onboard **Sublist3r**
- [ ] 3.21 — Onboard **Metagoofil**

**Geolocation / imagery**
- [ ] 3.22 — Onboard **OsintStalker** + **ReverseImageLocation**

**Tier 2 API wrappers (thin — just auth + call + normalize)**
- [ ] 3.23 — Shodan wrapper (free-tier API key)
- [ ] 3.24 — Censys wrapper (free-tier cap)
- [ ] 3.25 — AbuseIPDB + IPinfo wrappers

**Tier 2 link-only integration**
- [ ] 3.26 — Outbound-link result cards for TinEye, WHOIS, ViewDNS, DNSDumpster, Robtex, Netcraft, URLVoid — clearly labeled "opens externally," not a run

**Multi-domain frameworks (bigger lift — treat each as its own mini-project)**
- [ ] 3.27 — Study **PRISM**'s module structure and entity-graph/OPSEC-score approach as direct design reference
- [ ] 3.28 — Integrate **SpiderFoot** module subset (start with email/username/domain modules)
- [ ] 3.29 — Integrate **Recon-ng** as a secondary module source
- [ ] 3.30 — Onboard **GHunt**

**Milestone: v3.30 — full-catalog product, both tiers live, ingestion pipeline running on its own schedule. This is the version where "paste anything, get everything, and the catalog keeps growing itself" becomes true.**

---

## Phase 11 — Import Pipeline (v3.31–v3.37)
- [x] 3.31 — Generic file upload and transcript ingestion endpoint
- [x] 3.32 — Entity extraction engine from raw transcripts / case notes
- [x] 3.33 — Multi-pattern parser (emails, usernames, IPs, domains, phone numbers)
- [x] 3.34 — LLM chat-export importer (JSON structure parser)
- [x] 3.35 — Parse + display imported chat messages & extracted entities
- [x] 3.36 — Entity extraction from imported text with confidence scores
- [x] 3.37 — One-click OSINT run on any extracted entity directly from Import Drawer

---

## Phase 12 — Export Overhaul (v4.0–v4.4)
- [x] 4.0 — High-fidelity PDF dossier report template (HUD branding & classification)
- [x] 4.1 — Wire template to live aggregated graph & telemetry data
- [x] 4.2 — Fix image embedding and vector edge representation in PDF
- [x] 4.3 — Multi-result "case report" export dossier
- [x] 4.4 — CSV/JSON export with correlation metadata & source tool breakdown

## Phase 13 — Accessibility Pass (v4.5–v4.8)
- [x] 4.5 — Contrast audit adhering to HUD color system tokens
- [x] 4.6 — Screen-reader and ARIA labels on 3D interactive globe elements
- [x] 4.7 — Full keyboard-only navigation run-through
- [x] 4.8 — Global reduced motion toggle respected across particle animations & 3D rotation

## Phase 14 — Search, Categories, Favorites (v4.9–v4.12)
- [x] 4.9 — Full tool categorization across email, username, phone, domain, image, and IP domains
- [x] 4.10 — Category filter switcher tabs
- [x] 4.11 — Live fuzzy search across tool registry
- [x] 4.12 — Starred tool favorites with pinned priority ordering and local persistence

## Phase 15 — Guardrails & Performance (v4.13–v4.18)
- [x] 4.13 — Global rate limiting and resilient in-memory database fallback
- [x] 4.14 — First-load particle assembly sequence (1.5s ease-out)
- [x] 4.15 — Zero-dependency WebGL/Canvas 3D Particle Graph Engine
- [x] 4.16 — Proper error states and per-tool timeout protection (8s)
- [x] 4.17 — Live health telemetry diagnostics endpoint (`/health`)
- [x] 4.18 — Full bug bash and verification — v5.0 Production Ready

---

## Phase 16 — Scale & Multi-Domain Architecture (v5.0–v5.2)
- [x] 5.0 — Operator account authentication, JWT session security, and run history
- [x] 5.1 — Automated tool catalog ingestion from awesome-osint meta-lists
- [x] 5.2 — Public health, registry, and batch run endpoints
- [x] 5.3 — Auto-updater engine with GitHub commit tracking & one-click re-pull
- [x] 5.4 — Live OSINT resolvers (GitHub API, crt.sh CT logs, IP-API Geo/ASN, Cloudflare DoH)
- [x] 5.5 — Real-time OPSEC Exposure Score calculation & threat level matrix

---

## Phase 17 — Dual-Mode Visualizer & Enterprise Threat Formats (v6.0)
- [x] 6.0 — Dual-mode graph visualizer: seamless toggle between 3D Holographic Globe and 2D Tactical Force-Directed Graph
- [x] 6.1 — Interactive HUD camera controls: zoom in/out, pan, reset coordinates, raycasting node selection
- [x] 6.2 — STIX 2.1 Cyber Threat Intelligence JSON bundle exporter
- [x] 6.3 — MISP (Malware Information Sharing Platform) Event JSON exporter
- [x] 6.4 — Maltego Graph Transform CSV exporter
- [x] 6.5 — Node inspector popover with live entity confidence, source tool branding, and 1-click fan-out search

---

## Mission Complete (v6.0)

Every phase across the roadmap is built, normalized, and feeding the dual-mode 3D/2D visualizer and intelligence aggregation engine.
