# PROGRESS.md — Live Roadmap & Session Tracker
*Read AGENTS.md first for the rules — especially Section 0 (mission directive) and Section 4 (one version per session). This file tracks where the project actually is. TOOLS.md holds the full tool catalog Phase 10 pulls from.*

**CURRENT VERSION: v1.8 — done (Next: v1.9)**

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
- [ ] 1.9 — `GET /tools` endpoint
- [ ] 1.10 — `GET /tools/:id` endpoint
- [ ] 1.11 — Frontend: input box + auto-detected/selectable input type + matching tool list (flat, checkboxes)
- [ ] 1.12 — "Select All" + per-tool selection state
- [ ] 1.13 — Admin `POST /tools` endpoint

## Phase 3 — First real execution + Aggregation Engine v1 (v1.14–v1.22)
- [ ] 1.14 — Wire Holehe as an edge function (simplest of the three)
- [ ] 1.15 — `POST /run-batch` — accepts input + selected tool IDs, launches all in parallel
- [ ] 1.16 — Result Normalizer v1: map one tool's output into `{status, summary, entities[]}`
- [ ] 1.17 — Aggregation Engine v1: merge multiple tools' normalized entities into one result list, tag each entity with source tool
- [ ] 1.18 — Frontend: submit, per-tool loading state, live results as each tool finishes
- [ ] 1.19 — Add Sherlock (username domain) — proves the pattern generalizes across domains
- [ ] 1.20 — Add ExifTool (image domain, first file-upload input type)
- [ ] 1.21 — Per-tool timeout so one slow tool doesn't block the batch
- [ ] 1.22 — Result cache keyed on `(input, tool)` pair

**Milestone: v1.22 — first real working MVP across 3 domains.**

## Phase 4 — Accounts (v1.23–v1.27)
- [ ] 1.23 — Auth (signup/login/sessions)
- [ ] 1.24 — Protect run endpoints behind auth
- [ ] 1.25 — Run history table per user
- [ ] 1.26 — History page (list past runs)
- [ ] 1.27 — Re-open a past result without re-running

## Phase 5 — Export v1 (v1.28–v1.31)
- [ ] 1.28 — CSV export of one result
- [ ] 1.29 — JSON export of one result
- [ ] 1.30 — Playwright headless PDF proof-of-concept
- [ ] 1.31 — Wire PDF pipeline to a real aggregated result

**Milestone: v1.31 — feature-complete flat beta.**

---

## Phase 6 — 3D Shell: the Entity Graph Globe (v2.0–v2.7)
- [ ] 2.0 — Static particle/wireframe sphere rendered behind the existing flat UI, ambient idle rotation only (this is the signature visual — see AGENTS.md Section 3)
- [ ] 2.1 — Tool list rendered as HUD-style cards around/near the globe (still using flat click handlers underneath)
- [ ] 2.2 — Cards directly clickable/hoverable via raycasting, remove flat list
- [ ] 2.3 — Camera orbit/pan controls around the globe
- [ ] 2.4 — Loading-state motion redesign: globe assembling from scattered particles into a sphere as the platform initializes
- [ ] 2.5 — Reduce-motion toggle wired to every animation so far, including globe idle rotation
- [ ] 2.6 — Translucent glass HUD panels (cyan-glow borders per design system) for forms/results over the 3D scene
- [ ] 2.7 — Keyboard navigation through the HUD interface

## Phase 7 — Update Checker Engine (v2.8–v2.13)
- [ ] 2.8 — `lastCheckedCommit` field on `Tool`
- [ ] 2.9 — Cron job checks one tool's repo for new commit/tag
- [ ] 2.10 — Store + expose update-available flag
- [ ] 2.11 — Frontend update-available badge (amber accent, per design system) on tool card
- [ ] 2.12 — Extend cron to all registered tools
- [ ] 2.13 — "Update now" action (re-pull + redeploy)

## Phase 8 — Entity Graph Goes Live (v2.14–v2.19)
*This is where the globe stops being decorative and becomes the actual product visualization.*
- [ ] 2.14 — Graph data model: nodes (entities) + edges (which tool linked them, confidence)
- [ ] 2.15 — Map aggregation results onto the globe: discovered entities appear as glowing points on the sphere surface
- [ ] 2.16 — Light-trail edge animation drawing between points as the Aggregation Engine links results in real time
- [ ] 2.17 — Click a node → fan out a new search using that entity as input
- [ ] 2.18 — Source/confidence tagging visible per node (color-coded by source tool, per design system)
- [ ] 2.19 — Graph export (image/JSON) alongside the existing report export

---

## Phase 9 — Container Execution Foundation (v3.0–v3.3)
*Builds the general heavy-tool pipeline once, using PhoneInfoga as the proof case — then Phase 10 reuses this pipeline for every subsequent tool instead of rebuilding it.*
- [ ] 3.0 — BullMQ + Redis job queue
- [ ] 3.1 — Docker image for **PhoneInfoga**, isolated per-job container
- [ ] 3.2 — Job lifecycle (queued/running/done/failed), container teardown, live status via WebSocket/polling
- [ ] 3.3 — Per-user rate limit on container-tier tools + per-tool ToS-aware throttling

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
- [ ] 3.31 — Generic file upload endpoint
- [ ] 3.32 — Image extraction from uploaded archive + thumbnail preview
- [ ] 3.33 — Auto-run image-metadata tool on extracted images
- [ ] 3.34 — LLM chat-export importer (JSON)
- [ ] 3.35 — Parse + display imported chat messages
- [ ] 3.36 — Entity extraction from imported text (usernames/emails/phones)
- [ ] 3.37 — One-click OSINT run on any extracted entity

---

## Phase 12 — Export Overhaul (v4.0–v4.4)
- [ ] 4.0 — Real PDF report template (header, per-tool sections, branding)
- [ ] 4.1 — Wire template to real aggregated data
- [ ] 4.2 — Fix image embedding in PDF
- [ ] 4.3 — Multi-result "case report" PDF
- [ ] 4.4 — CSV/JSON matching the multi-result grouping

## Phase 13 — Accessibility Pass (v4.5–v4.8)
- [ ] 4.5 — Contrast audit
- [ ] 4.6 — Screen-reader labels on 3D interactive elements
- [ ] 4.7 — Full keyboard-only run-through
- [ ] 4.8 — Fix what 4.7 found

## Phase 14 — Search, Categories, Favorites (v4.9–v4.12)
- [ ] 4.9 — Tool categorization
- [ ] 4.10 — Category filter in 3D gallery
- [ ] 4.11 — Fuzzy search across tools
- [ ] 4.12 — Favorites, favorites-first ordering

## Phase 15 — Guardrails & Performance (v4.13–v4.18)
- [ ] 4.13 — Global per-user rate limiting
- [ ] 4.14 — First-load performance/pacing pass
- [ ] 4.15 — Lazy-load 3D scene assets
- [ ] 4.16 — Proper error states (tool/source down)
- [ ] 4.17 — Logging/monitoring hook
- [ ] 4.18 — Full bug bash — "v4.0 stable" release

---

## Phase 16 — v5.0: Scale
- [ ] 5.0 — Team/workspace accounts
- [ ] 5.1 — Community tool-submission pipeline
- [ ] 5.2 — Public read-only registry API
- [ ] 5.3 — Self-updating heavy tools on new commits

---

## When you run out of checkboxes

Don't stop. Re-read TOOLS.md — if a tool exists there that isn't checked off anywhere above, add it as a new version at the end of Phase 10 and keep going. Per AGENTS.md Section 0, the project isn't finished until the catalog is exhausted.
