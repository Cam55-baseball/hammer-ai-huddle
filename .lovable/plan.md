# Final Demo War-Room Pass

Presentation-resilience hardening for `/relational/demo`. No architecture, no new primitives, no new doctrine. One new gated surface (`?presenter=1` overlay) — allowed under presentation-mode-lock as "presentation resilience".

## 1. Rehearsal & telemetry capture

Use the in-sandbox browser to walk the full `/relational/demo` flow at 440×782, then 1280×720:
- Record per-step dwell, transition times, any console errors, network waterfall.
- Capture screenshots at each of the 9 steps; check for null/undefined flashes, layout shift, scroll friction.
- Verify `/relational?fallback=fixture` renders the same components against in-memory seed.
- Log findings into `docs/asb/relational-rehearsal-log.md` (timings, flat spots, dead clicks).

## 2. Resilience hardening

Audit and fix any of these that the rehearsal exposes:
- **Cold refresh:** confirm `RelationalDemo` lazy chunk loads with a graceful skeleton, no white screen.
- **Loading skeletons:** every projection-dependent component must render a `bg-muted animate-pulse` placeholder while `useRelationalProjections` is loading. Patch any component returning `null` on undefined.
- **Null guards:** in all 7 relational components + `RelationalDemo`, replace any `data.x.y` access with optional chaining + fallback copy from `copy.ts`.
- **Fallback route guarantee:** ensure `/relational?fallback=fixture` always works even if Supabase is unreachable (force fixture seed path, skip live fetch).
- **Projection cold-start:** add a 1-frame `requestAnimationFrame` warm in `RelationalDemo` mount so first step paints before user clicks Next.

No schema, no `prepareRows`, no `emit.ts`, no projection logic changes.

## 3. Performance stabilization (only if rehearsal flags)

- Wrap `RelationalDemo` step content in `React.memo` keyed by step id.
- Memoize `useRelationalProjections` selectors with `useMemo` if a flamegraph shows recompute on every step change.
- Strip any `console.log` left in `src/components/relational/*` and `src/lib/relational/*` and `RelationalDemo.tsx`.
- Remove `debug` prop usage from the live demo page (keep in `/relational` admin surface).

## 4. Copy polish via `copy.ts`

Only edit `src/lib/relational/copy.ts`. Refine:
- Hammer turn cadence — shorter, fewer connectives, one reflective question per 3 statements.
- Parent reassurance — lead with protection, never recruiting.
- Recruiting safeguard — "we hold this until you are ready" framing.
- Developmental stage descriptions — observational, not prescriptive.
- Slump-recovery transitions — name the slump, don't fix it.

Voice: concise, calm, intelligent, non-hype, human. No exclamation marks. No "you got this".

## 5. Presenter Assist overlay (gated by `?presenter=1`)

New file: `src/components/relational/PresenterOverlay.tsx`. Mounted only inside `RelationalDemo` when `new URLSearchParams(location.search).get("presenter") === "1"`. Absent in production by default.

Features:
- Fixed bottom-right pill (z-50, semantic tokens only).
- Keyboard: `→`/`Space` next step, `←` prev, `R` reset to step 1, `F` open fallback route in new tab.
- Section label (current step name + index `3 / 9`).
- Timing helper: elapsed time since first step, target band (e.g., "Slump Reload — target 2:00").
- Quick-jump select (1–9).
- "Fallback reset" button that navigates to `/relational/demo?presenter=1` and forces step 1.

Zero effect on the surface when `?presenter=1` is absent — no DOM nodes, no listeners, no state.

## 6. Final Readiness Report

Create `docs/asb/relational-final-readiness.md`:
- Measured presentation runtime (min/typical/max).
- System stability status.
- Highest-risk failure point + mitigation.
- Fallback confidence (Low/Med/High) with evidence.
- Emotional coherence rating (1–5) per step.
- Technical coherence rating (1–5).
- Final **go / no-go** recommendation with conditions.

## Files

- New: `src/components/relational/PresenterOverlay.tsx`, `docs/asb/relational-rehearsal-log.md`, `docs/asb/relational-final-readiness.md`.
- Edit (only as rehearsal demands): `src/pages/RelationalDemo.tsx` (mount overlay, null-guard), `src/lib/relational/copy.ts` (polish), individual relational components (skeletons / null guards only — no projection logic).
- Untouched: `prepareRows`, `emit.ts`, `buildAsbRow`, schemas, migrations, projection types, ASB topics.

## Out of scope

- New ASB topics, new primitives, new megaphases, new doctrine.
- Any schema or DB migration.
- New top-level routes beyond `/relational/demo` (already registered).
- Changes to `/relational` admin surface beyond bug fixes surfaced by rehearsal.
