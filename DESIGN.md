# DESIGN.md — TraceMesh Visual System
*The complete reference for every visual decision in the product. AGENTS.md Section 3 is the summary; this is the full spec. When building any component, check here first — don't invent new colors, spacing, or motion patterns ad hoc.*

---

## 1. Color system

### Background
| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#0a0e14` | App background, behind the 3D scene |
| `bg-surface` | `#111826` | Panel/card background (before glass effect applied) |
| `bg-surface-raised` | `#161f30` | Elevated panels — modals, active tool cards |
| `bg-overlay` | `#0a0e14` at 70% opacity | Backdrop behind modals/dialogs |

### Text
| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#e8edf4` | Headings, primary content |
| `text-secondary` | `#9aa7bd` | Labels, secondary info, timestamps |
| `text-muted` | `#5e6b82` | Disabled states, placeholder text |

### Accent — cyan (primary, "live/active")
| Token | Hex | Usage |
|---|---|---|
| `accent-cyan` | `#22d3ee` | Active states, live indicators, primary buttons, glow borders |
| `accent-cyan-dim` | `#0e7490` | Cyan at rest / secondary emphasis |
| `accent-cyan-glow` | `#22d3ee` at 40% opacity, blurred | Panel border glow, node glow on the entity globe |

### Accent — amber (warnings/updates only — never decorative)
| Token | Hex | Usage |
|---|---|---|
| `accent-amber` | `#f59e0b` | Update-available badges, overdue items, rate-limit warnings |
| `accent-amber-dim` | `#92400e` | Amber at rest |

### Status
| Token | Hex | Usage |
|---|---|---|
| `status-success` | `#34d399` | Job completed, tool healthy |
| `status-error` | `#f87171` | Job failed, tool unreachable |
| `status-running` | `#22d3ee` (same as accent-cyan) | Job in progress |

**Rule:** amber and red are the only "interrupt" colors. If a component isn't warning about something or reporting an error, it doesn't get amber or red — this is what keeps the warning system legible instead of everything looking equally urgent.

---

## 2. Typography

| Token | Font | Size | Weight | Usage |
|---|---|---|---|---|
| `display` | Inter | 2.5rem / 40px | 600 | Page-level headings only |
| `heading` | Inter | 1.5rem / 24px | 600 | Panel titles |
| `body` | Inter | 0.9375rem / 15px | 400 | Standard UI text |
| `label` | Inter | 0.75rem / 12px | 500, uppercase, +0.04em tracking | Field labels, panel headers ("LIVE INTELLIGENCE FEED" style) |
| `data` | JetBrains Mono | 0.875rem / 14px | 400 | Hashes, IDs, coordinates, timestamps, raw tool output |
| `data-large` | JetBrains Mono | 1.25rem / 20px | 500 | Hero numbers (job counts, percentages on gauges) |

**Rule:** `label` style (uppercase, monospace-adjacent tracking) is what makes this read as a HUD instead of a generic dashboard. Use it consistently for every panel header and field label — don't mix in regular sentence-case headings.

---

## 3. Spacing scale

4px base unit. Use only these values — no arbitrary pixel values in component styles:

`4px · 8px · 12px · 16px · 24px · 32px · 48px · 64px`

- Panel internal padding: 16px (24px for larger panels)
- Gap between panels: 16px
- Gap between related inline elements (icon + label): 8px

---

## 4. Core components

### HUD Panel
- Background: `bg-surface`, ~85% opacity for the glass effect, `backdrop-filter: blur(12px)`
- Border: 1px solid `accent-cyan-dim`, with a soft outer glow (`box-shadow: 0 0 12px accent-cyan-glow`) only on **active/focused** panels — resting panels get a plain 1px border, no glow, so the glow stays meaningful
- Corner treatment: subtle clipped corners (4-8px angled cut on 1-2 corners) rather than uniform border-radius — reinforces the technical/HUD feel without looking like a generic rounded card
- Header: `label` typography, bottom border 1px `accent-cyan-dim` at 30% opacity

### Tool Card
- Base: HUD Panel styling
- States: `idle` (plain border) → `hover` (cyan glow appears) → `selected` (cyan glow + checkmark, persistent) → `running` (animated pulse on the border) → `done` (border shifts to `status-success` briefly, then settles back to `selected`)
- Update-available: small amber dot, top-right corner, persistent until acknowledged

### Radial Gauge
- Used for: scan progress, system load (CPU/RAM equivalents), confidence scores
- Ring thickness: 4px, track color `bg-surface-raised`, fill color `accent-cyan` (or `status-error`/`status-success` when representing pass/fail)
- Center label: `data-large` for the number, `label` style beneath for the unit/description
- Animate the fill sweep on value change (300ms ease-out) — never snap instantly

### Command Bar
- Fixed bottom, full-width, HUD Panel styling with heavier glow (this is the primary action surface)
- Left: input type detected (email/username/etc.) as a small tag that updates live as the user types
- Right: submit button, `accent-cyan` filled, disabled state at `text-muted`
- Placeholder text uses `text-secondary`, not `text-muted` — it should read as an invitation, not a disabled hint

### Entity Graph Globe
- See AGENTS.md Section 3 for behavior spec. Visual params:
  - Base wireframe: `accent-cyan-dim` at 25% opacity, thin lines
  - Entity nodes: 3-6px glowing points, color = source tool's assigned accent (see Section 6 below)
  - Edges (links between entities): animated draw-in, 400ms, `accent-cyan` at 60% opacity, fading to 20% once settled so newer connections stay visually prominent
  - Idle rotation: ~20s per full rotation, pauses on hover/interaction

### Badges (status/update indicators)
- Pill shape, `label` typography, background = status color at 15% opacity, border = status color at 60% opacity, text = status color at full
- Never filled solid — this keeps them from competing with the cyan glow system for visual weight

---

## 5. Motion specification

| Interaction | Duration | Easing | Notes |
|---|---|---|---|
| Panel hover glow appear | 150ms | ease-out | |
| Tool selection toggle | 200ms | ease-in-out | |
| Radial gauge fill | 300ms | ease-out | |
| Entity node appear on globe | 250ms | ease-out, scale + fade in | |
| Edge draw-in on globe | 400ms | ease-in-out | Line grows from source to target node |
| Loading sequence (globe assembling) | 1.2–1.8s | ease-out | Particles converge from scattered to sphere formation |
| Page/panel transition | 200ms | ease-in-out | Crossfade, not slide — slides read as "navigating," this product should feel like one continuous space |

**Global rule:** nothing animates for longer than ~1.8s except the initial load sequence. Long animations make a control-room interface feel sluggish, which undermines the whole HUD premise (this is supposed to feel responsive and live).

**Reduce-motion mode:** all durations above collapse to ≤50ms or become instant state changes. The globe's idle rotation stops entirely. Edge draw-ins become instant appearances. Nothing about the *information* changes — only the animation.

---

## 6. Source-tool color coding (for the entity graph)

Each Tier 1 tool gets a fixed, consistent accent hue used everywhere it appears (node color on the globe, badge on results, legend). Don't reuse the cyan/amber system colors here — these need to be visually distinct from each other and from the UI chrome:

| Tool | Hue |
|---|---|
| Sherlock | `#818cf8` (indigo) |
| Holehe | `#34d399` (green) |
| ExifTool | `#fb923c` (orange — distinct from amber-warning, more saturated/lighter) |
| Maigret | `#a78bfa` (violet) |
| PhoneInfoga | `#38bdf8` (sky blue) |
| *(assign the next open hue from a consistent rotation as each new tool is onboarded — log the assignment in DECISIONS.md so it never gets reused)* |

---

## 7. Accessibility specs

- Minimum contrast: 4.5:1 for body text against its background, 3:1 for large text (18px+/bold 14px+) — verify every color pairing above against this, not just the ones that look fine by eye
- Every interactive 3D element (globe nodes, tool cards) needs a keyboard-reachable equivalent — tab order follows visual left-to-right, top-to-bottom regardless of 3D depth
- Focus state: 2px `accent-cyan` outline, offset 2px — visible on every focusable element, no exceptions for "it breaks the aesthetic"
- Screen reader labels describe function, not visual appearance ("Run Sherlock username scan," not "cyan glowing card")

---

## 8. What NOT to do

- No literal Iron Man / JARVIS / Stark Industries branding or assets anywhere (see AGENTS.md Section 3)
- No motion without a state it's communicating
- No amber/red used decoratively — reserve them or the warning system stops meaning anything
- No arbitrary spacing values outside the 4px scale
- No third accent color introduced without updating this file first — the two-accent system (cyan/amber) is deliberate and should stay small
