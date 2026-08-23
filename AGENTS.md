# AGENTS.md — Project Brief for [TraceMesh]
*Read this file in full before doing any work. This is the contract for how this project gets built. If anything here conflicts with what you're about to do, stop and follow this file.*

---

## 0. Mission directive — read this every session

This project is not "done" at any single commit. It is done when **every phase in `.project-ai/PROGRESS.md` is checked off** and **every tool in `.project-ai/TOOLS.md` is integrated, normalized, and feeding the aggregation engine**. Do not declare the project complete early. Do not stop because the product "already works well enough" — a working v1.31 beta is a milestone, not a finish line.

Within a single session, still obey Section 4: **one version, one scope, then stop and report.** The directive above is about the project's overall trajectory across many sessions, not permission to sprawl within one. Never confuse "don't stop until the vision is achieved" with "don't stop working right now" — the former means keep returning to `PROGRESS.md` and picking up the next unchecked item every session; the latter would break the versioning discipline this whole file exists to protect.

If you ever finish everything currently listed in `PROGRESS.md`, don't stop there either — check `TOOLS.md` for any tool not yet onboarded, add it as a new version at the end of the current phase, and keep going.

---

## 1. What this project is

An OSINT tool-aggregator website. One input box, any identifier type — email, username, phone number, image, domain, IP — and the platform:

1. Detects which registered tools can handle that input type
2. Lets the user pick which of the matching tools to run (checkbox list + "Select All")
3. Runs the selected tools **in parallel**
4. Merges every tool's output into **one structured intel view** — an entity graph: the searched value as the root, with every discovered username, linked platform (GitHub, TikTok, etc.), breach record, or associated identifier as a connected node, each tagged with which tool found it
5. Lets the user click any discovered entity to fan out a new search from it

This is not a single-domain tool. Email is just the first domain implemented — username, phone, image, and domain/IP lookups follow the exact same pattern (registry → checkboxes → parallel run → aggregation). Never hardcode logic that only works for email; always build against the general `input_type` abstraction.

**Not in scope for now:** anything requiring paid API keys with real cost per call unless explicitly approved — flag it instead of wiring it in silently.

---

## 2. Architecture (do not deviate without updating this file)

**Execution model — hybrid:**
- Lightweight tools (single API call, fast) → serverless/edge functions
- Heavy tools (multi-site scrapers, reverse image search) → isolated Docker containers via a job queue (BullMQ + Redis), torn down after each run

**Stack:**
- Frontend: Next.js, React Three Fiber (3D), Tailwind, Framer Motion, Zustand
- Backend: NestJS, Prisma + Postgres, BullMQ + Redis
- Execution: Docker (containerized runners), Playwright (PDF export)

**Core subsystems:**
- **Tool Registry** — DB table of every integrated tool: name, category, `input_type[]`, source repo URL, execution type, input/output schema, current tracked version/commit
- **Update Checker** — scheduled job that polls each tool's source repo for new commits/tags, flags "update available," supports one-click re-pull + redeploy. This is what makes the platform maintain itself instead of you manually re-cloning tools.
- **Result Normalizer** — per-tool adapter that maps that tool's raw output into one common `{status, summary, entities[]}` shape, where `entities` is the list of discovered facts (usernames, links, records) feeding the aggregation graph
- **Aggregation Engine** — merges normalized results from every tool run in a batch into the entity graph, deduplicates, tags each fact with its source tool, surfaces "run another search on this entity" actions

---

## 3. Design system — non-negotiable

**Full spec lives in `.project-ai/DESIGN.md` — read it before building any UI component.** This section is the summary; DESIGN.md has exact color tokens, typography scale, spacing scale, component specs, motion timing, and the source-tool color-coding system.

**Visual direction: sci-fi command-center HUD.** Dark control-room dashboard, not a marketing site. Reference: futuristic holographic interfaces (glowing wireframes, radial data gauges, particle-based 3D visuals) — the genre, not any specific copyrighted character or franchise. **Never use the name "Jarvis," Stark Industries branding, the Iron Man helmet silhouette, or any Marvel-owned visual asset — these are copyrighted/trademarked and must not appear anywhere in the shipped product,** including placeholder text, code comments, or asset filenames.

- **3D centerpiece — the Entity Graph Globe:** a rotating particle/wireframe sphere is the platform's signature visual and is not decorative — it *is* the entity graph (full behavior spec in DESIGN.md Section 4). Build it early; every other visual supports it.
- **Motion communicates state, never decorates** (exact timings in DESIGN.md Section 5).
- **Global reduce-motion toggle**, respected everywhere, including the globe's idle rotation.
- **Accessibility is built in per-feature, not swept at the end** (full specs in DESIGN.md Section 7).
- **First load must feel intentional, not rushed** — the globe assembling itself from scattered particles is the loading sequence.

---

## 4. Versioning & commit protocol

**Numbering starts at v1.0.** This is a fresh project.

**Every version = one working session = one commit (or tightly related small commit series).** Never bundle multiple versions' work into one commit, and never let a session sprawl into "while I'm here, let me also build the next version's feature." If you finish early, stop and report — don't scope-creep forward.

**Commit message format:**
```
feat(scope): short description [v1.7]
```
Example: `feat(registry): add input_type field and seed 3 tools [v1.7]`

**Before starting any session:**
1. Read `.project-ai/PROGRESS.md` to find the current version number and its task
2. Read `.project-ai/DECISIONS.md` for any architecture decisions made in prior sessions that affect this task
3. Do only that version's scope — nothing from a later version, nothing "extra"

**At the end of every session:**
1. Commit with the format above
2. Update `.project-ai/PROGRESS.md`: mark the version done, note anything discovered that changes a future version's plan
3. If you made a real architectural decision (not just an implementation detail), log it in `.project-ai/DECISIONS.md` with a one-line reason

---

## 5. Reference material to consult, not copy blindly

- **Full tool catalog:** `.project-ai/TOOLS.md` — every top-tier open-source OSINT tool to onboard, organized by domain, with notes on execution tier and maintenance status. This is the backlog for Phase 10 in PROGRESS.md.
- **OSINT methodology:** clone `mukul975/anthropic-cybersecurity-skills` and use the Reconnaissance-domain skills as playbook reference when implementing any tool-specific crawling/correlation logic. These are structured workflows, not code to paste in — adapt them to this project's schema.
- **Codebase self-understanding:** once there's real code to reason about, install `Egonex-AI/Understand-Anything` (Claude Code/Antigravity plugin) and run it to build a knowledge graph of this repo — useful for you (the agent) to stay oriented as the codebase grows past what fits in one context window.

---

## 6. The version roadmap lives in `.project-ai/PROGRESS.md`, not here

This file (`AGENTS.md`) is the constitution — it changes rarely. `PROGRESS.md` is the live tracker — it changes every session. Don't let the roadmap drift out of sync with what's actually built; if a version's scope changes mid-session, update `PROGRESS.md` to reflect reality before committing.

---

## 7. What "done" means for this project

A full working product where: any of the supported identifier types can be pasted in, the user sees and selects from real matching tools, results come back as one coherent intel report (not a pile of raw JSON), the platform tells the user when a tool has updates, and the interface itself looks and feels like a real product — not a prototype with a 3D logo bolted on.
