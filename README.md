# TraceMesh

> **OSINT Tool-Aggregator & Intelligence Correlation Platform**

TraceMesh is a unified OSINT platform featuring a sci-fi command-center HUD interface and an interactive 3D entity correlation graph. TraceMesh connects and executes multi-domain OSINT tools in parallel, normalizing disparate outputs into a coherent intelligence graph.

---

## ⚡ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Framer Motion, Three.js / React Three Fiber, Lucide Icons
- **Backend**: NestJS 11, Prisma ORM, BullMQ + Redis, PostgreSQL
- **Workspace**: pnpm Monorepo Workspaces (`apps/web`, `apps/api`, `packages/shared`)

---

## 🚀 Quickstart & Setup

### Prerequisites

- **Node.js**: `v20+` (Recommended: Node 22+)
- **pnpm**: `v9+` or `v11+` (`npm install -g pnpm`)
- **Docker & Docker Compose**: For local PostgreSQL and Redis services

---

### Step 1: Clone and Configure Environment

```bash
# Copy example environment file
cp .env.example .env
```

---

### Step 2: Start Infrastructure (PostgreSQL + Redis)

```bash
docker compose up -d
```

This starts:
- **PostgreSQL**: `localhost:5432` (db: `tracemesh`)
- **Redis**: `localhost:6379`

---

### Step 3: Install Dependencies

```bash
pnpm install
```

---

### Step 4: Run Development Server

```bash
# Run both API and Web concurrently
pnpm dev

# Or run separately:
pnpm dev:api    # NestJS API running on http://localhost:3001
pnpm dev:web    # Next.js Web HUD running on http://localhost:3000
```

---

## 📁 Repository Structure

```
tracemesh/
├── apps/
│   ├── api/          # NestJS backend application
│   └── web/          # Next.js frontend (HUD & 3D Entity Graph)
├── packages/
│   └── shared/       # Shared TypeScript types and schema definitions
├── docker-compose.yml # PostgreSQL and Redis infrastructure
├── .env.example       # Base environment variables template
├── DESIGN.md          # TraceMesh design system specification
├── PROGRESS.md        # Session roadmap and live implementation tracker
└── TOOLS.md           # OSINT catalog and integration registry
```

---

## 🛠️ Scripts

| Command | Action |
|---|---|
| `pnpm build` | Compile all packages and applications |
| `pnpm dev` | Start development servers in parallel |
| `pnpm dev:api` | Start NestJS backend in watch mode |
| `pnpm dev:web` | Start Next.js frontend in development mode |
| `pnpm lint` | Run code linting |
| `pnpm test` | Run test suites |
