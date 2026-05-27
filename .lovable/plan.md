# Wave 3 — UX Simplification & Dashboard Convergence

Additive, presentation-only pass. No schema, no ASB runtime, no replay/lineage/confidence/parity logic touched. Every existing data hook, projection, emitter, and TrustFooter stays exactly as-is.

## Scope at a glance

| Surface | Change type | Files (primary) |
|---|---|---|
| `/today` (Dashboard) | Reorder + mount Command Center inline | `src/pages/Today.tsx` |
| Identity Card | Visual rebuild (glass surface, contrast, hierarchy) | `IdentityCommandCard.tsx`, `IdentityBanner.tsx`, `useIdentityState.ts` |
| Weekly Digest | Plain-language story mode + structure rebuild | `AthleteDigest.tsx`, `digest/*Card.tsx`, `lib/digest/sentences.ts`, new `DigestStorySection.tsx` |
| Bounded Forecast | Timeline-card rewrite, anti-jargon copy | `ForecastSurface.tsx`, `forecast/*Card.tsx`, `lib/digest/sentences.ts` |
| Global a11y/usability | Tap targets, spacing, progressive disclosure | shared `RuntimeCard`, `TrustFooter`, simplify toggle |

---

## 1. Command Center → Dashboard convergence

**Goal:** `/today` becomes the single organism surface; sidebar Command link becomes deep-link only.

Reorder `src/pages/Today.tsx` to:

```text
1. PulseStrip
2. CommandCenter (inlined — extracted from AthleteCommand.tsx body)
3. Today Prescription
4. Weekly Organism Digest (compact preview → link to /digest)
5. Bounded Forecast (compact preview → link to /forecast)
6. Recovery / Education / History
```

- Extract the Command body from `pages/AthleteCommand.tsx` into `components/command/CommandCenterSection.tsx` (pure layout — no auth/onboarding redirects). Both `/today` and `/command` render it; the standalone `/command` route stays for deep-links.
- Each Command card capped at: one headline, one "why" sentence, one primary action. Secondary detail moves behind a "More" disclosure.
- Section headings use large type, single-line labels (e.g. "How you are today", not "Today").

## 2. Identity Card visual rebuild

`IdentityCommandCard.tsx` + `IdentityBanner.tsx` (banner currently still uses `bg-gradient-to-br` + neon glow — must follow the calm token set already in `useIdentityState.ts`).

Visual recipe:
- Surface: `bg-card` with a soft layered glass effect — `before:` pseudo with `bg-gradient-to-b from-foreground/[0.02] to-transparent`, `ring-1 ring-border`, `shadow-sm`.
- Left 3px tier accent bar (already in card — port to banner).
- Remove every `bg-gradient-to-br from-slate-900…`, `drop-shadow-[0_0_12px…]`, `text-slate-100/400/500` literal. All text → `text-foreground` / `text-muted-foreground`.
- Hierarchy (top→bottom): Athlete name · Organism state (tier label) · Primary focus (today's standard) · Recovery status · streak chips row · TrustFooter (confidence · lineage · replay · engine version) in `text-xs text-muted-foreground`.
- Score: tier-colored number only (`scoreText`), no glow, `tabular-nums`.
- Chips: single recipe `h-6 rounded-full bg-muted/50 border-border text-xs`.
- Adaptive text: not needed once dark overlay is removed — `bg-card` already guarantees AA against `text-foreground` in both themes.

## 3. Weekly Digest — organism story

Add `components/digest/DigestStorySection.tsx` rendering four blocks built from existing projections (no new data):

| Block | Source projection | Copy template |
|---|---|---|
| This week | `organismChange` | "Your body is {stable / building / overloaded / recovering / ready}." |
| What improved | `workloadShift`, `recoveryContinuity` (positive delta) | "You are recovering better than last week." |
| Needs attention | `behavioralTrend`, `escalationEmerged` | "This week your workload climbed faster than usual." |
| What to do next | derived from above | "Hold your sleep window for the next 3 nights." |

Rules enforced in `lib/digest/sentences.ts` additions:
- Max 2 lines per insight, ≤ 140 chars.
- Sentence starts: "Your body is…" / "You are…" / "This week…".
- Replace numeric outputs with state words `stable | building | overloaded | recovering | ready` (numbers move under "Show details").
- "Explain simply" toggle in `WeeklyDigestHeader` — **default ON**, persists in `localStorage`. When OFF, current dense cards render.
- Each block has one visual indicator (icon + tier-colored dot), optional `<Collapsible>` "Learn more" exposing the existing dense card verbatim — preserves every confidence/lineage/replay link.

## 4. Bounded Forecast simplification

`ForecastSurface.tsx` reshaped into three timeline cards: **Next 3 days · Next week · Longer trend**. Built from existing `useForecastProjection()` — workload/readiness/behavioral continuation grouped by horizon, no new computation.

Each card answers four lines:
- What may happen — plain ("You may feel more tired by the weekend.")
- Why — lineage one-liner
- What helps
- What increases risk

Add to `lib/digest/sentences.ts`: `plainContinuationSentence(projection, horizon)` mapping confidence + delta into the anti-jargon phrasing. `FORECAST_BOUNDARY_DISCLAIMER` stays in TrustFooter only. Existing `ForecastWindowCard` / `ProjectionConfidenceCard` / missingness cards move behind a "Show technical view" toggle (default OFF). Removes the default-on grid of 6 dense cards.

Tone: calm, anti-fear, anti-shame — no "risk score" framing.

## 5. Universal usability pass

Applied across Dashboard / Digest / Forecast / Identity / Command:
- Tap targets ≥ 44×44 (button `size="icon"` → add `min-h-11 min-w-11`).
- Section headings `text-lg sm:text-xl font-semibold`, generous `space-y-6` between sections.
- Progressive disclosure: every "advanced" surface inside `<Collapsible>` default-closed.
- Single label vocabulary — remove duplicates (e.g. "Readiness" vs "How ready"; pick the plain one).
- Reduce simultaneous cards: digest grid `xl:grid-cols-3` → `md:grid-cols-2` with story section above.
- All literal `text-slate-*`, `text-gray-*`, `bg-slate-*` swept to semantic tokens.
- Replace `h-screen` with `h-dvh` where found in changed files.

## 6. Invariants preserved (verification gates)

Before completion, confirm by inspection (no logic edited in these areas):
- `src/lib/asb/*`, `src/lib/runtime/*`, `src/lib/digest/projections.ts`, all `useAthleteCommandRows` / `useDigestProjection` / `useForecastProjection` — untouched.
- TrustFooter rendered on every refactored card (confidence · lineage · replay · engine_version).
- Replay drilldown links (`/replay/:eventId`) preserved.
- No new event emissions, no schema migrations, no edge function changes.
- Existing tests run unchanged: `foundationScorer.replay`, `replay-determinism-wave3`, `asb invariants parity` — pass.

## 7. Deliverable on completion

- List of surfaces touched + file diffs summary
- Before/after readability notes (token swaps, contrast)
- A11y improvements (tap targets, semantic tokens, dvh)
- Dashboard convergence summary (`/today` final order + `/command` deep-link status)
- Remaining risks (e.g. users used to numeric digest may need "Show details" guidance)
- Confirmation block: "Schema unchanged · Replay unchanged · Lineage unchanged · TrustFooter present · Tests pass"

## Out of scope (explicit)

No changes to: ASB event model, projections, modulators, capability gates, scope filtering, parity matrix, CI rules 1–18, auth, onboarding redirects, edge functions, database.
