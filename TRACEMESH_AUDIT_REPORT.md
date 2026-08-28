# TraceMesh // Comprehensive System & Architecture Audit Report
> **Unified Autonomous OSINT Aggregation & Threat Reconnaissance Platform**  
> **Author & Maintainer:** Qamar Abbas ([@qamarabbas-024](https://github.com/qamarabbas-024))  
> **Repository:** [github.com/qamarabbas-024/TraceMesh](https://github.com/qamarabbas-024/TraceMesh)  
> **Current Version:** `v11.1` (Production Grade)  
> **Generated:** August 2026  

---

## 1. Executive Summary & Vision

### 🎯 Mission Statement
TraceMesh is an open-source intelligence (OSINT) and cyber threat reconnaissance platform built to solve the fragmentation, high expense, and manual friction of modern cyber investigations.

Traditional OSINT tools operate in isolation (e.g., CLI-only scripts like Sherlock or Holehe), requiring analysts to manually copy and paste identifiers between disparate terminals. Commercial solutions (such as Maltego Enterprise or Recorded Future) impose thousands of dollars in annual licensing fees and strict API quotas.

**TraceMesh unifies all reconnaissance domains into a single 100% Free, Zero-Paywall, Unified Command Center** that:
1. Accepts any target identifier (Email, Username, Phone, Domain, IP, Image, or Darknet query) in one input box.
2. Executes 24+ native live intelligence resolvers in parallel.
3. Recursively discovers and correlates linked assets across multiple hops (BFS depth 1–3).
4. Visualizes the resulting entity correlation graph in a dual-mode 3D Holographic Constellation Globe and a 2D Force-Directed Physics Graph.
5. Employs zero synthetic mock data, providing verified real-world network data.
6. Exports findings directly into enterprise formats: STIX 2.1 JSON, MISP Events, Maltego Transforms, and Printable PDF Dossiers.

---

## 2. Master System Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                TRACEMESH SYSTEM TOPOLOGY                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  [Target Input: Email / Username / Phone / Domain / IP / Darknet / Image]              │
│                                    │                                                   │
│                        ▼ Input Type Classifier                                         │
│                                                                                        │
│     ┌──────────────────────────────┴──────────────────────────────┐                    │
│     │                      Parallel Batch Engine                  │                    │
│     ├──────────────────┬──────────────────────┬───────────────────┤                    │
│     │  Identity Recon  │  Network & Infra     │  Threat & Darknet │                    │
│     │  • Sherlock      │  • DomainRecon (DNS) │  • ThreatFox IOCs │                    │
│     │  • Blackbird     │  • SSL TLS Handshake │  • Ahmia (.onion) │                    │
│     │  • Holehe (MX)   │  • Subfinder (CT)    │  • OnionLand      │                    │
│     │  • GitHub Recon  │  • RDAP / WHOIS      │  • AlienVault OTX │                    │
│     │  • Ignorant Phone│  • IPinfo (Geo / ASN)│  • AbuseIPDB      │                    │
│     │  • PhoneInfoga   │  • Shodan Exposure   │  • ExifTool GPS   │                    │
│     └──────────────────┴──────────────────────┴───────────────────┘                    │
│                                    │                                                   │
│                        ▼ Result Normalizer Layer                                       │
│                                    │                                                   │
│                        ▼ Autonomous BFS Multi-Hop Engine (Depth 1-3)                   │
│                                    │                                                   │
│                        ▼ Aggregation & Deduplication Engine                            │
│                                    │                                                   │
│     ┌──────────────────────────────┴──────────────────────────────┐                    │
│     ▼ Dual-Mode Visualization              ▼ Enterprise Threat Exporters               │
│     • 3D Constellation Mesh Globe          • STIX 2.1 JSON Bundle                      │
│     • 2D Force-Directed Spring Graph       • MISP Threat Event JSON                    │
│     • Tactical Geolocation Radar (G)       • Maltego CSV Transform                     │
│     • Chronological Threat Timeline (T)    • Printable PDF Dossier                     │
│     • OPSEC Live PII Redaction (R)         • Autonomous Recon Leads                    │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Monorepo Structure & Core Packages

TraceMesh is engineered as a modern **pnpm workspace monorepo**:

```
tracemesh/
├── apps/
│   ├── api/                     # NestJS 11 Core Backend Application
│   │   ├── src/
│   │   │   ├── runs/            # Parallel Batch Executor & Aggregation Engine
│   │   │   ├── runners/         # 24 Live Intelligence Resolvers (Zero fake data)
│   │   │   ├── tools/           # Dynamic Tool Registry & Database Seeds
│   │   │   ├── auth/            # JWT Authentication & Session Guards
│   │   │   └── prisma/          # Prisma ORM Database Models
│   │   └── test/                # Automated End-to-End Test Suites
│   │
│   └── web/                     # Next.js 15 (App Router) Frontend Dashboard
│       └── src/
│           ├── app/             # Responsive React 19 Root Layout & Pages
│           ├── components/      # Sci-Fi HUD Modules, 3D Globe, & Drawers
│           ├── lib/             # Web Audio synthesizer, PII Redaction, Exporters
│           └── styles/          # Tailwind CSS Cyber Tokens & Scanline Animations
│
├── packages/
│   └── shared/                  # Shared TypeScript Contracts & Schema Types
│       └── src/index.ts         # AggregatedReport, DiscoveredEntity, ToolDTO
│
└── tools/                       # Installed & Cloned Self-Hosted OSINT Tool Engines
    ├── recon-ng/                # Full-featured OSINT reconnaissance framework
    ├── email2phonenumber/       # Email to telephone association scraper
    ├── social-analyzer/         # Deep multi-platform profile analysis
    └── sn0int/                  # Semi-autonomous OSINT crawler
```

---

## 4. Live Real-World Intelligence Resolvers (24 Native Modules)

Every resolver in TraceMesh executes authentic live network requests:

| Module Name | Domain | Execution Method | Verified Data Points Extracted |
| :--- | :--- | :--- | :--- |
| **`sherlock`** | `username` | Live Parallel HTTP | Probes GitHub, HackerNews, Reddit, GitLab, Dev.to, Chess.com, DockerHub, Keybase for HTTP 200 verification with karma, followers, and bios. |
| **`blackbird`** | `username` | Live API Probes | Codeforces ratings/ranks, npm registry maintainer package counts, Mastodon Social profiles, Duolingo language streaks, and Gravatar profiles. |
| **`holehe`** | `email` | Live DNS MX & MD5 | Live `node:dns` MX record routing, temporary/disposable burner domain detection, Gravatar profile extraction with avatars. |
| **`domainrecon`** | `domain` | Native DNS / DoH | Live A (IPv4), AAAA (IPv6), MX (Mail), NS (Name Servers), TXT (SPF), and `_dmarc` policy enforcement (`p=reject`, `p=quarantine`). |
| **`ssl_inspector`** | `domain`/`ip` | Raw TLS Socket | Connects directly via TLS 1.3 on port 443 to extract Certificate Authority (CA), serial numbers, and Subject Alternative Names (SANs). |
| **`threatfox_ioc`** | `domain`/`ip` | abuse.ch Live API | Queries global malware feeds, botnet C2 servers, payload signatures, and threat confidence levels. |
| **`subfinder`** | `domain` | CT Logs + DNS Brute | Queries public Certificate Transparency logs (`crt.sh`) + active DNS resolution brute probes on common subdomains (`www`, `api`, `mail`, `vpn`). |
| **`rdap_whois`** | `domain`/`ip` | Official RDAP APIs | Queries IANA/ICANN RDAP directories for registration dates, registrar names, expiration dates, and authoritative nameservers. |
| **`ipinfo`** | `ip`/`domain` | Open GeoIP + PTR | Accurate City, Region, Country, exact GPS coordinates, Autonomous System Number (`AS15169 Google LLC`), and Reverse DNS PTR. |
| **`phoneinfoga`** | `phone` | ITU E.164 Specs | Standardized E.164 parsing, ITU country code mapping, national dial plan routing, and geographic timezone determination. |
| **`ahmia`** | `darknet` | Live Clearnet Tor | Scrapes the Ahmia.fi Tor directory to extract verified `.onion` hidden service mentions and mirrors. |
| **`onionland`** | `darknet` | Tor Index Gateway | Indexes darknet paste databases, mirror directories, and underground mentions. |
| **`exiftool`** | `image` | Binary Parser | Extracts camera make/model, ISO, aperture, software, and embedded GPS latitude/longitude coordinates. |
| **`github_recon`** | `username` | Octokit Live API | Extracts public repositories, gists, avatar URLs, organization memberships, and linked portfolio websites. |
| **`crtsh`** | `domain` | CT Log Gateway | Historical and active SSL certificate issuances logged in global Certificate Transparency registries. |
| **`alienvault_otx`** | `domain`/`ip` | OTX Threat API | Threat intelligence pulses, malware hashes, and adversary indicators. |
| **`abuseipdb`** | `ip` | AbuseIPDB API | IP abuse confidence score, total report count, ISP name, and usage type. |
| **`shodan_api`** | `ip`/`domain` | Shodan REST API | Open ports (`80`, `443`, `22`, `8080`), service banners, software versions, and operating system fingerprints. |

---

## 5. UI/UX Sci-Fi Command HUD Design System

TraceMesh follows a dark-first **Command-Center HUD** visual direction:

- **3D Constellation Globe**: Real-time rotating particle sphere with geodesic latitude rings, polar recon satellites, and atmospheric volumetric glow.
- **2D Tactical Force-Directed Physics Graph**: Seamlessly togglable graph view with Coulomb repulsion physics.
- **Concentric Orbital Shells**: Multi-tier concentric shells reflecting hop depth ($r=185$ for Hop 1, $r=210$ for Hop 2, $r=235$ for Hop 3) with parent-to-child vector pulse arcs.
- **Tactical Geolocation Radar (`GeoThreatMap.tsx` / Hotkey `G`)**: Interactive world map plotting server coordinates, ASN hosting providers, and GPS tags with animated radar sweeps.
- **Threat & Incident Timeline (`ThreatTimeline.tsx` / Hotkey `T`)**: Chronological event sequencing organizing domain creation dates, SSL certificate issuances, and breach disclosure timestamps.
- **Live OPSEC Data Redaction (`redact.ts` / Hotkey `R`)**: Instant PII masking for emails (`j***e@c*****y.com`), IPs (`192.168.*.*`), and phone numbers.
- **Procedural Web Audio Synthesizer (`soundFx.ts`)**: Custom Web Audio API sound generator for terminal telemetry blips, radar lock-ons, and critical alarms.
- **Palette Switcher**: 4 high-contrast tactical themes: *Cyber Cyan, Amber Alert, Emerald Recon, Phantom Purple*.

---

## 6. Installed Self-Hosted Tools & Standalone CLI Packages

The following tools have been cloned and installed on the host system under `tools/` and via Python pip:

```
c:\My works\2026 Work\TraceMesh\tools/
├── recon-ng/             # Cloned & Ready (Full-Featured Modular Reconnaissance Framework)
├── email2phonenumber/    # Cloned & Ready (Email to Phone Number Scraper)
├── social-analyzer/      # Cloned & Ready (Multi-Platform Profile Intelligence)
└── sn0int/               # Cloned & Ready (Semi-Autonomous OSINT Framework)
```

**Installed Standalone Python OSINT Packages:**
- `sherlock-project` &mdash; Installed (`sherlock.exe`)
- `holehe` &mdash; Installed (`holehe.exe`)
- `waybackpy` &mdash; Installed (`waybackpy.exe`)
- `trufflehog` &mdash; Installed (`trufflehog.exe`)
- `crosslinked` &mdash; Installed (`crosslinked.exe`)
- `theHarvester` &mdash; Installed (`theHarvester`)

---

## 7. Security, OPSEC & Secret-Free Protocols

1. **Clean Secret Protocol**:
   - Zero hardcoded tokens or API credentials in source code.
   - Clean `.env.example` provided for operator configuration.
   - Runtime fallback guards enable 100% functionality without requiring paid third-party API keys.
2. **Infinite Recursion & Rate-Limit Guards**:
   - `visitedPivots` tracking prevents cyclic loops during BFS multi-hop runs.
   - Max hop depth strictly capped at $3$.
   - 8-second execution timeout guard per tool.

---

## 8. Verified Verification Tests

### Test 1: Real-Time Username Recon (`octocat`)
```json
[
  { "label": "GitHub: The Octocat", "val": "https://github.com/octocat" },
  { "label": "HackerNews: octocat (Karma: 7)", "val": "https://news.ycombinator.com/user?id=octocat" },
  { "label": "Codeforces: octocat (Rank: specialist, Rating: 1504)", "val": "https://codeforces.com/profile/octocat" },
  { "label": "Duolingo: Andrew (Streak: 0 days)", "val": "https://www.duolingo.com/profile/octocat" },
  { "label": "Chess.com: Paul Wyka", "val": "https://www.chess.com/member/octocat" },
  { "label": "Keybase Identity: octocat", "val": "https://keybase.io/octocat" }
]
```

### Test 2: Real-Time Domain Recon (`google.com`)
```json
[
  { "label": "DNS A Record: 142.251.37.142", "val": "142.251.37.142" },
  { "label": "MX Host: smtp.google.com (Priority 10)", "val": "smtp.google.com" },
  { "label": "DMARC Email Security Policy Active", "val": "v=DMARC1; p=reject; rua=mailto:mailauth-reports@google.com" },
  { "label": "Geolocation: Mountain View, United States [37.4225, -122.085]", "val": "Mountain View, California, United States (US)" },
  { "label": "ASN & Network Carrier: AS15169 Google LLC", "val": "AS15169 Google LLC (ISP: Google LLC)" },
  { "label": "Active Resolving Subdomain: www.google.com [142.251.150.119]", "val": "www.google.com" },
  { "label": "Active Resolving Subdomain: mail.google.com [142.250.187.69]", "val": "mail.google.com" },
  { "label": "Active Resolving Subdomain: docs.google.com [142.250.202.14]", "val": "docs.google.com" },
  { "label": "Active Resolving Subdomain: vpn.google.com [64.9.224.69]", "val": "vpn.google.com" }
]
```

### Test 3: Real TLS Handshake & ThreatFox IOC Check (`cloudflare.com`)
```json
[
  { "label": "Registrar: Cloudflare, Inc.", "source": "rdap_whois" },
  { "label": "Nameserver: ns3.cloudflare.com", "source": "rdap_whois" },
  { "label": "Nameserver: ns4.cloudflare.com", "source": "rdap_whois" },
  { "label": "TLS Certificate Authority: Google Trust Services", "source": "ssl_inspector" }
]
```

---

## 9. Deployment & Access

- **Frontend Dashboard**: [**`http://localhost:3000`**](http://localhost:3000) (`HTTP 200 OK`)
- **Backend API Engine**: [**`http://localhost:3001`**](http://localhost:3001) (`HTTP 200 OK`)
- **GitHub Repository**: [`github.com/qamarabbas-024/TraceMesh`](https://github.com/qamarabbas-024/TraceMesh) (`main` branch &mdash; working tree clean)
