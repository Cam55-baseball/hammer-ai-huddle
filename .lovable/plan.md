# Final UX Parity Pass — Additive Only

No schema, runtime, projection, hook, or doctrine changes. All ASB lineage, replay, confidence, TrustFooter, and CI rules preserved.

---

## 1. AthleteCommand → CommandCenterSection parity

**Goal:** `/command` becomes a thin wrapper around the same `CommandCenterSection` already mounted on `/today`. One canonical surface, identical spacing/typography/TrustFooter/state semantics.

- Rewrite `src/pages/AthleteCommand.tsx` to:
  - Keep auth + onboarding redirects (unchanged logic).
  - Render `<DashboardLayout>` → header row (`TodayOverviewHeader` already inside section is reused) → `<CommandCenterSection compact={false} />` → `<RecentEventsPreview rows={rows} loading={isLoading} />` for the "Recent activity" tail only.
  - Use the same `useAthleteCommandRows({ days: 30, limit: 500 })` once at page level and pass `rows` to `RecentEventsPreview`; `CommandCenterSection` continues to own its own fetch (cached by react-query under the same key so no double network call).
  - Drop the local `Section` helper and the duplicated 4-card / behaviour / signals grids — those now live exclusively inside `CommandCenterSection`.
- Extend `CommandCenterSection` with an optional `defaultSignalsOpen?: boolean` prop so the deep-link `/command` route opens the behaviour+signals collapsible by default while `/today` keeps it collapsed. No new state, no new events.

Outcome: identical card hierarchy, identical `IntelligenceCardShell` wrapper, identical TrustFooter row (already inside the shell), identical spacing rhythm (`space-y-4`, `gap-4`, `md:grid-cols-2`) across both routes.

## 2. Terminology simplification (display strings only)

Edit only the `title` / `subtitle` props passed to `IntelligenceCardShell` and the collapsible label. No topic IDs, projection keys, or event names touched.

| File | Before | After |
|---|---|---|
| `RecoveryCard.tsx` | "Recovery" / "Latest behavioral/foundation recovery event" | "Recovery" / "How well you're bouncing back" |
| `BehavioralRegulationCard.tsx` | "Behavioral regulation" | "Habits" / "Your recent behaviour patterns" |
| `EscalationFlagsCard.tsx` | "Escalation flags (72h)" | "Needs Attention" / "Flags from the last 3 days" |
| `SchedulingLoadCard.tsx` | "Scheduling load" | "Schedule Load" / "How packed your week looks" |
| `TrendShiftsCard.tsx` | "Trend shifts" | "Trends" / "What's changing week over week" |
| `FatigueCard.tsx` subtitle | technical phrasing | "How tired your body looks today" |
| `WorkloadCard.tsx` subtitle | technical phrasing | "How much load you've been carrying" |
| `ReadinessCard.tsx` subtitle | technical phrasing | "How ready you are to train today" |
| `CommandCenterSection.tsx` collapsible | "Show behaviour, schedule & signals" | "Show habits, schedule & trends" |

## 3. Identity card final hierarchy

Edit `src/components/identity/IdentityBanner.tsx` (and one tiny addition to `useIdentityState.ts`) to expose the canonical 5-row organism identity:

```
A. Athlete name           (text-xs muted, top label row)
B. Organism state         (LABEL — text-3xl bold, primary)
C. Primary focus          (one short sentence, text-sm muted)
D. Recovery status        (new row, plain English)
E. Confidence + lineage   (TrustFooter — quiet, bottom)
```

Changes:
- Replace the "Tier" pill block with a name row: pull `user.user_metadata.full_name ?? user.email` from `useAuth()`; render as `text-xs uppercase tracking-[0.25em] text-muted-foreground` above the state label. Falls back gracefully when missing.
- Keep the big state `LABEL` (`text-3xl sm:text-4xl font-bold`) as row B; remove the inline "Tier" badge so the headline reads cleanly.
- Add a **Primary focus** line driven by the existing `tier` value (pure derivation, no new event): one sentence per tier (e.g. elite → "Hold the line. Recovery is your edge.", building → "Stack consistent days. Small wins compound.").
- Add a **Recovery row** built from existing `snapshot.nn_miss_count_7d`, `discipline_streak`, and `performance_streak` (already in `IdentitySnapshot`). Pure UI mapping:
  - `nnMiss === 0 && discStreak >= 3` → "Recovering Well" (emerald dot)
  - `nnMiss >= 3` → "Needs More Recovery" (rose dot)
  - else → "Stable" (sky dot)
  - Render as `inline-flex items-center gap-2 h-7 rounded-full bg-muted/40 border border-border px-3 text-sm`.
- Quiet TrustFooter: move the existing streak chips (`perf`, `active`, `NN miss/7d`) into a single bottom row using the same chip class already in use, separated by a `border-t border-border/60 pt-3 mt-4`. Confidence/lineage stay subtle.
- Adaptive spacing: container uses `p-4 sm:p-5 md:p-6`; right-side consistency score uses `text-5xl md:text-6xl`. No layout shift.
- Subtle sheen: keep the existing `bg-gradient-to-b from-foreground/[0.03]` top hairline; add a single `transition-shadow duration-500 hover:shadow-md` on the container. No parallax, no animated gradients, performance-safe.
- Expose two tiny helpers from `useIdentityState.ts` (additive only): `focusSentence: string` and `recoveryStatus: { label: 'Recovering Well' | 'Needs More Recovery' | 'Stable'; tone: 'emerald' | 'rose' | 'sky' }`. Pure derivations from existing snapshot fields — no new query, no schema.

## 4. Micro-interaction polish

- Add a shared `transition-colors duration-200` and `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` to the `Card` wrapper in `IntelligenceCardShell` (via `className` merge) so every command card gets identical hover/focus behaviour.
- Reserve space in `IntelligenceCardShell` body via the existing `min-h-[64px]` — extend the TrustFooter row to also reserve `min-h-9` so replay refreshes don't reflow.
- Replace the raw `animate-pulse bg-muted/50` skeleton with a slightly softer `bg-muted/40 rounded-md` block, matching height of the populated state to prevent jitter when projections land.
- Collapsible chevron: keep existing `transition-transform`; add `motion-reduce:transition-none` so reduced-motion users get instant toggles.

No flashy animations introduced. No new dependencies.

## 5. Accessibility + readability hardening

- `IntelligenceCardShell` `LineageDrilldownButton` already inside footer — ensure wrapper has `min-h-11` on the footer row for thumb reach (currently `pt-3` only).
- `CommandCenterSection` collapsible trigger already `min-h-11`; verify and keep.
- Identity banner streak chips bumped from `h-6` → `h-7` and `text-xs` → `text-sm` so elderly readers can parse them at default zoom.
- Add `aria-live="polite"` to the consistency score wrapper so screen readers announce updates from the count-up without spam.
- Replace remaining `text-[10px]` micro-labels in the banner with `text-[11px]` and add `whitespace-nowrap` to the "Consistency" caption to prevent wrap collisions at 320–360px viewports.
- Confirm no card uses raw color classes; semantic tokens only (already true after Wave 2/3).

## 6. Files touched (additive edits only)

- `src/pages/AthleteCommand.tsx` — slim wrapper around `CommandCenterSection` + `RecentEventsPreview`.
- `src/components/command/CommandCenterSection.tsx` — add `defaultSignalsOpen` prop; rename collapsible label.
- `src/components/command/IntelligenceCardShell.tsx` — focus ring, footer min-height, softened skeleton.
- `src/components/command/cards/*.tsx` — 8 files, display string edits only (title/subtitle/empty copy). No logic, no projection changes.
- `src/components/identity/IdentityBanner.tsx` — 5-row hierarchy, recovery row, quiet footer, hover shadow, a11y.
- `src/hooks/useIdentityState.ts` — additive `focusSentence` + `recoveryStatus` derivations from existing snapshot fields.

## Out of scope (explicitly not touched)

- `src/lib/asb/*`, `src/lib/command/projections.ts`, `src/lib/runtime/*`, `src/lib/digest/*` projections.
- `useAthleteCommandRows`, `useAsbTimeline`, `useEngineRecomputeTrigger`, any Supabase query.
- `asb_events` schema, edge functions, migrations.
- TrustFooter signals (engine version, confidence pill, missingness chip, lineage drilldown) — visible and unchanged.
- Capability gates, parity matrix, CI rules 1–18, replay determinism, event chronology.

## Verification

- Compare `/today` and `/command` side-by-side: same card grid, same shell, same TrustFooter row, same chip styling.
- Identity card on `/dashboard` shows name → state → focus sentence → recovery status → quiet metrics footer with confidence/lineage still one tap away.
- Existing parity/replay/invariant tests untouched and pass unchanged (only display strings + presentational JSX modified).
