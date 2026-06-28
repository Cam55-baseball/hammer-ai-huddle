# Progress Dashboard — Topic Landing & Correlations

## Goal
Add a new landing layer above the existing Progress Dashboard. Users land on a grid of topic buttons ordered by what matters most to *their* development, expand any topic into a drop-down panel of layouts/data, see correlations (auto + manual), and ask Hammer questions inline on every panel.

The existing ProgressDashboard sections are preserved and reused inside the panels — nothing is deleted.

## Topics (Release-1 trust-safe only)
Buttons render in a priority order computed per athlete (see Prioritization). Initial set:

1. **Pitching** — tempo_sec + landmark-backed metrics (only mounts if athlete has pitching discipline + sessions).
2. **Readiness & Recovery** — HIE snapshot, fatigue, recovery continuity from `useDigestProjection`.
3. **Workload & Schedule** — schedule posture (`useScheduleWindow` / `scheduleContext`), training load, upcoming games/tournaments, canceled/rescheduled awareness.
4. **Goals & Mind** — ranked category goals progress + behavioral/mood signals.

Each topic is gated: if there's no underlying data (e.g. no pitching sessions), the button renders with a "Not enough data yet" state rather than fabricating.

## Prioritization
A single deterministic helper `rankProgressTopics(ctx)` orders the buttons by what's most important for *this* athlete right now:

- Sport / discipline from `useHammerAthleteContext` (pitcher → Pitching first; position player without pitching → demote).
- Schedule posture (game-week / tournament → Readiness & Workload float up).
- Active escalations from digest projection (behavioral escalation → Goals & Mind floats up).
- Top-ranked onboarding category goal influences ordering ties.
- Subscription tier gates *which* topics appear (free tier sees a subset; paid tiers unlock correlations explorer + deeper panels). Tier read from existing tier utility.

No new scores are invented — this is pure ordering of existing surfaces.

## Panel anatomy (same shape every topic)
Each drop-down panel renders:

1. **Snapshot row** — the existing widgets for that topic (e.g. `UhrcAthleteSection` for Pitching, `useDigestProjection` cards for Readiness, `HammerScheduleStrip` summary for Workload, `CategoryGoalsCard` for Goals).
2. **Auto-correlation cards** — top 1–3 deterministic correlations for the topic (e.g. "Tempo is 0.18s faster on days after ≥7h sleep, n=12"). Computed client-side from already-loaded command rows / session rows; no new tables. Each card shows sample size + a "low data" badge when n is small. Suppressed entirely when n < threshold.
3. **Correlations explorer** (collapsible) — two dropdowns (X variable, Y variable) sourced from the topic's whitelisted fields, renders a small scatter/line via existing recharts, plus a one-line plain-language reading.
4. **Ask Hammer (inline)** — `HammerChat` mounted in compact mode with a `categoryFocus`-style scoped payload describing the panel's topic, current snapshot values, and the correlations shown. Reuses existing chat infrastructure; no new edge function.

Panels are accordion-style — only one open at a time on mobile, multi-open allowed on desktop.

## Files

New:
- `src/pages/ProgressLanding.tsx` — new landing page (route swap, see below).
- `src/components/progress/TopicButtonGrid.tsx` — ranked button grid.
- `src/components/progress/TopicPanel.tsx` — shared accordion panel shell (snapshot + correlations + inline chat).
- `src/components/progress/panels/PitchingPanel.tsx`
- `src/components/progress/panels/ReadinessPanel.tsx`
- `src/components/progress/panels/WorkloadPanel.tsx`
- `src/components/progress/panels/GoalsMindPanel.tsx`
- `src/components/progress/correlations/AutoCorrelationCards.tsx`
- `src/components/progress/correlations/CorrelationExplorer.tsx`
- `src/lib/progress/rankProgressTopics.ts` — deterministic ordering.
- `src/lib/progress/correlations.ts` — pure functions: pearson, sample-size gate, plain-language reading. No fabrication when n is small.
- `src/lib/progress/topicVariables.ts` — whitelisted X/Y variables per topic.
- `src/hooks/progress/useTopicAvailability.ts` — gates each topic on real data presence + subscription tier.

Modified:
- Router entry for `/progress` (or current ProgressDashboard route) → renders `ProgressLanding`. The existing `ProgressDashboard` component is still importable and rendered inside an "All sections (classic view)" panel at the bottom for continuity.

## Trust guardrails
- Correlations only use variables already trusted in Release-1 (tempo_sec, HIE fields, schedule events, mood/escalation events, goal completion events). No LLM-inferred metrics.
- Every correlation card displays n and date window; cards with n below threshold are hidden, never smoothed.
- "Ask Hammer" inherits the existing MEASUREMENT TRUTH LOCK system prompt — Hammer can explain what's shown but cannot invent scores.

## Out of scope
- New database tables, edge functions, or background jobs.
- Cross-athlete benchmarks.
- Any change to the existing ProgressDashboard's internals.

## Verification
After build:
1. Playwright into `/progress`, confirm topic buttons render in priority order for a pitcher vs. position player.
2. Expand each panel, confirm snapshot widgets mount, correlations show n + window, and inline HammerChat sends a message scoped to the panel.
3. Confirm low-data topics show "Not enough data yet" instead of empty charts.
4. Confirm classic ProgressDashboard still reachable from the bottom panel.
