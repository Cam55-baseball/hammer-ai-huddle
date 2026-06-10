# Hammer Report Card — Finish Integration + Visual Spectacle

Building on the contracts, grade engine, and metric readers already shipped. Two tracks in parallel: (A) wire the system end-to-end so "Not detected" disappears for real captures, (B) turn the card into the most visually loved surface in the app.

---

## Track A — Make it actually work everywhere

### A1. `analyze-video` returns structured `metrics{}`
- Build the AI request schema dynamically from each discipline contract (`metricKeys[]` → JSON schema with `{value:number|null, confidence:0–1, missing?:boolean, missing_reason?:string}`).
- Keep existing narrative prose untouched; add `metrics` as a sibling field in `Output.object`.
- Inject per-metric prompt hints (unit, threshold, what to look for) from the contract into the system prompt so the model fills real numbers, not nulls.
- Persist `metrics` JSON on the analysis row alongside narrative.

### A2. Tile compute reads the new payload
- `metricReaders.ts` already returns `{value, confidence, missing, reason}`. Wire `HammerReportCard` to compute every tile from `metrics{}` first, fall back to legacy narrative parsing only if `metrics` is absent (older rows).
- Confidence < 0.5 → amber dot + tooltip "Low confidence — verify on replay".
- Missing → existing "Not detected" state but now with the model's `missing_reason` (e.g. "Camera angle hid front hip").

### A3. Backfill — "Recompute Report Card" button
- New edge fn `recompute-report-card` that re-runs analyze-video in metrics-only mode against a stored video URL and patches the row.
- Button lives on Library/Saved-video detail and Coach view. Disabled while running, toast on success.

### A4. Cross-app surfaces
- **Library / Saved Video Detail** — render full `<HammerReportCard />` inline.
- **CoachAthleteDetail** — same card per session, plus a compact "last 5 sessions" strip.
- **Progress Dashboard** — `useReportCardTrend()` hook → per-metric pass-rate sparkline tiles for the athlete's last N sessions.
- **Monthly / Vault Recap** — aggregate non-negotiable pass rate %, top 3 regressions, top 3 improvements; reuse grade ribbon as the hero.

### A5. Cleanup
- Remove vestigial `Uhrc*` components and `hittingV1Schema.ts` once new path is verified.

---

## Track B — Make it a spectacle

Design language: **stadium scoreboard meets premium fitness tracker meets trading-card foil**. Dark glassy base, neon team-color accents, weighty typography, animated numerics, tactile motion. Mobile-first (440px is current viewport) — card has to look incredible on a phone first, desktop second.

### B1. The Grade Ribbon (hero)
- Massive letter grade (A–F) rendered in a heavy display face (Bebas Neue or Archivo Black), 96–120px on mobile.
- Grade letter sits inside a **holographic foil card** — animated conic-gradient shimmer behind the letter, subtle parallax tilt on device orientation (gyro) and pointer move on desktop.
- Color tier per grade: A=emerald glow, B=cyan, C=amber, D=orange, F=red. All via HSL tokens, both light/dark mode.
- Animated count-up of the 0–100 score on mount (spring, ~900ms).
- Coverage chip ("8/10 measured") with a tiny radial progress.
- Failed-non-negotiable chip pulses gently red.

### B2. Tile Meters
- Replace flat pass/fail boxes with **radial dial meters** (SVG arc, 0→threshold→max). Pointer animates from 0 on mount with spring physics.
- Pass zone = emerald arc gradient, warning band = amber, fail band = red. The dial *itself* shows where the athlete landed against the threshold — instantly readable.
- Tile background: subtle dark glass (`backdrop-blur` + `bg-card/60`), 1px gradient border that brightens on the pass color.
- Tap → tile flips (3D) to reveal: raw value, threshold, confidence bar, "why this matters" microcopy from the contract, replay timestamp link.
- Non-negotiable tiles get a small ⚡ bolt badge in the corner.

### B3. Phase Rail
- Horizontal "P1 → P2 → P3 → P4" rail above the tiles (BH) / equivalent grouping (BP).
- Each phase node is a glowing orb sized by tile count, colored by aggregate phase pass-rate. Connecting line animates fill on mount.
- Tap a phase → tiles below filter/highlight to that phase.

### B4. Motion + polish
- Mount sequence: ribbon foil sweep → score count-up → phase rail fill → tiles stagger-in (50ms each) with scale + fade.
- Use Framer Motion (already in stack). Respect `prefers-reduced-motion` — fall back to instant fades.
- Haptic-style micro-bounce on tile tap (mobile).
- Optional **"Share Card" mode**: full-bleed 9:16 export-ready layout with athlete name, date, grade, top 3 tiles, hammer logo watermark. Renders to PNG via `html-to-image` for share-sheet/IG-story export.

### B5. Sound (optional, off by default)
- Single subtle "score lock-in" tick when grade reveals. Toggle in settings; never auto-plays.

### B6. Design tokens
- Add to `index.css`:
  - `--grade-a/b/c/d/f` HSL pairs (color + glow).
  - `--foil-gradient` conic.
  - `--meter-pass / --meter-warn / --meter-fail` arcs.
  - `--glass-card` surface.
- All tile/ribbon/meter components consume tokens — zero hardcoded hex.

---

## Files (Track A)
- edit `supabase/functions/analyze-video/index.ts` (+ shared contract mirror under `supabase/functions/_shared/reportCardContracts.ts`)
- new `supabase/functions/recompute-report-card/index.ts`
- edit `HammerReportCard.tsx`, `ReportCardTile.tsx`, `ReportCardGradeRibbon.tsx`
- new `src/hooks/useReportCardTrend.ts`
- edit Library detail page, `CoachAthleteDetail.tsx`, `ProgressDashboard.tsx`, monthly/vault recap edge fn
- delete `Uhrc*`, `hittingV1Schema.ts`

## Files (Track B)
- new `src/components/report-card/hammer/visuals/FoilGradeCard.tsx`
- new `src/components/report-card/hammer/visuals/RadialMeter.tsx`
- new `src/components/report-card/hammer/visuals/PhaseRail.tsx`
- new `src/components/report-card/hammer/visuals/TileFlip.tsx`
- new `src/components/report-card/hammer/ShareCard.tsx` (+ install `html-to-image`)
- edit `src/index.css` — grade/foil/meter tokens
- edit `tailwind.config.ts` — register new color tokens

## Validation
- Run real analysis → metrics populated, tiles show values not "Not detected".
- Letter grade matches non-negotiable rules (1 fail = D cap, 2+ = F cap).
- Backfill button patches an old row.
- Trend strip renders across ≥2 sessions.
- Card looks incredible at 440×782 (current viewport), still clean at desktop.
- Reduced-motion users see static version.
- Share Card exports a clean 1080×1920 PNG.

## Out of scope
- SB windmill-specific tiles, throwing/SH visual upgrades (same engine, but visual spectacle pass is BP+BH first).
- Real-time tile updates during streaming analysis.
- ML pose estimation.
