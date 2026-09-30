# DECISIONS.md — Architecture Decision Log
*Append one entry per real architectural decision made during a session. Implementation details don't belong here — only decisions that would confuse a future session if undocumented.*

Format:
```
## [vX.X] Decision title
**Decided:** what was chosen
**Why:** one-line reason
**Alternatives considered:** (optional)
```

---

## [v1.0] Monorepo Structure & Package Management
**Decided:** pnpm workspaces monorepo containing `apps/api` (NestJS), `apps/web` (Next.js App Router + Tailwind), and `packages/shared` (TypeScript definitions and shared contracts).
**Why:** Clean boundary separation between edge/heavy execution backend and Next.js HUD interface while sharing common input/output and tool schemas directly.

## [v1.22] Parallel Multi-Domain Runner & Aggregation Architecture
**Decided:** NormalizedResult contract mapping all tool outputs into standardized DiscoveredEntity array with deduplication and source-tool confidence weighting in AggregationService.
**Why:** Enables arbitrary tool additions across email, username, and image domains to feed directly into the unified entity graph without UI modification.

## [v24.5] Resilient In-Memory Report Graph Preservation & Headless Verification
**Decided:** Full AggregatedReport tree attached directly to in-memory history ring buffer records with cache fallback in getRunById(), coupled with dual-engine Playwright headless verification.
**Why:** Ensures 100% operational resilience for STIX 2.1, MISP, and PDF export gateways even during complete database offline/unreachable conditions.

## [v25.0] Dual-Engine DoH Fallback, Empty ToolId Auto-Expansion, & Scalar Metadata Link Safety
**Decided:** Parallelized DNS lookups via Cloudflare/Google DoH fallback in DomainReconRunner, auto-expansion of empty tool selections to all domain-compatible tools, and strict primitive-scalar comparison in GraphAnalyticsService metadata link evaluator.
**Why:** Eliminates Windows system DNS timeouts, prevents 0-tool empty reports from CommandBar, and prevents TypeError object-to-primitive conversion crashes during multi-node graph aggregation.

## [v25.3] Zero-Key Public OSINT Resolvers & Visual Recon Previews
**Decided:** Integrated URLScan.io public search API with visual screenshot extraction, live Tor Project Onionoo consensus relays for dynamic 3-hop routing, HaveIBeenPwned public 1,000+ incident breach directory correlation, and live multi-platform HTTP probes in Maigret.
**Why:** Delivers 100% accurate, factual intelligence directly from public open-source feeds without requiring paid API keys, replacing synthetic mock modulo computations with real network data.


