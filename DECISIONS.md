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

