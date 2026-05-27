# Plan — Command Center as Dashboard + Human Language Pass

Additive UI-only changes. No schema, hook, projection, runtime, or test changes. All ASB lineage, replay, confidence, missingness, engine_version, and TrustFooter wiring stays intact — only the **visible strings and visual hierarchy** change. Internal topic IDs, engine version pins, and dev surfaces (`/asb/*`, `/replay/*`, `/ops/*`, owner pages) are untouched.

---

## 1. `/today` — Command Center becomes the dashboard

`src/pages/Today.tsx`
- Drop the extra `Today / {date}` header and the `max-w-3xl` shell — let CC breathe full-width (`max-w-5xl`).
- Render order, no surrounding `RuntimeCard` wrappers around CC:
  1. `<PulseStrip rx={rx} />` (kept, but spacing tightened to `space-y-3` against CC so they read as one block)
  2. `<CommandCenterSection defaultSignalsOpen={false} />` — visually dominant, no outer container
  3. `<PrescriptionCard />` (today's plan)
  4. Compact link row: "Weekly recap", "What's next", "Log how I feel" as 3 small tiles instead of 3 stacked `RuntimeCard`s
  5. Recent history (renamed from "Recent prescriptions & overrides" → "Recent activity"; rows show human topic label, not `font-mono` topic id — use existing `TopicLabel`)
- Remove the "Becomes a canonical event you and your coach can both replay" sentence → "Quick check-in. Your coach can see it too."

`src/components/command/TodayOverviewHeader.tsx`
- Title: "Command Center" → **"How your body is doing today"**
- Subline: drop `last event {ISO timestamp}` → "Updated {relative time}" or nothing when empty
- Replace `engine {ENGINE_VERSION}` badge with a small muted "Live" dot; keep `ENGINE_VERSION` available in a `title=` tooltip only (still rendered in DOM for ops, just not as a visible mono badge)
- Remove sticky positioning so it merges into the page rather than feeling like a sub-module header

---

## 2. Athlete-facing language rewrite (display strings only)

Topic IDs, payload keys, and projection code are **not touched**.

`src/components/command/cards/ReadinessCard.tsx`, `FatigueCard.tsx`, `RecoveryCard.tsx`
- Remove the `{p.topicId}` mono caption next to the score (it leaks `behavioral.readiness` etc.). Replace with a plain word: "today", "today", "this week".

`src/components/command/cards/WorkloadCard.tsx`
- "events · raw count, not smoothed" → "training days this week"

`src/components/command/cards/SchedulingLoadCard.tsx`
- Title "Schedule Load" → "Your week"
- Replace raw `event_type` keys (`athlete.schedule.day_type`, etc.) in the list with a small human map: `practice → "Practice"`, `game → "Game"`, `lift → "Lift"`, `rest → "Rest"`, fallback = title-cased last segment. Unknown keys are humanized, never shown as dot.notation.

`src/components/command/cards/EscalationFlagsCard.tsx`
- "replay →" link text → "see why"

`src/components/command/EscalationBanner.tsx`
- "{n} unacknowledged escalation(s)" → "{n} thing{s} that need a look"
- "Most recent:" → "Latest:"
- Button "Open replay" → "See why"

`src/components/command/CommandCenterSection.tsx`
- Collapsible label "Show/Hide habits, schedule & trends" → "Show more details" / "Hide details"

`src/components/command/IntelligenceCardShell.tsx`
- "No source event yet" empty fallback → "Not enough info yet"
- Remove the `occurred_at {ISO}` mono footer line (engine version + occurred_at still passed into TrustFooter for advanced/coach surfaces, just hidden from athlete cards).

`src/components/command/ConfidencePill.tsx`
- Visible label "conf {n}%" → "{n}% sure" (e.g. "82% sure"); when null → "—". Tooltip → "How sure we are based on your recent check-ins."

`src/components/command/MissingnessChip.tsx`
- `live` → "Up to date"
- `no_signal` → "No info yet"
- `stale` → "Needs a fresh check-in"
- `partial` → "Some info missing"
- Tooltips rewritten in plain language; remove the word "event".

`src/components/command/LineageDrilldownButton.tsx`
- "View lineage" → "Why?" (icon kept). Disabled tooltip → "Nothing to show yet."

`src/components/runtime/TrustFooter.tsx`
- Drop the inline `engine_version` mono string from athlete render (keep it in DOM as a `title` attribute on the row for ops parity; no visible mono engineering text).
- The relative time stays as the only visible meta.

---

## 3. Sweep for other leaks shown in athlete mode

Limited, screen-targeted edits — not a global rename:

- `src/pages/Today.tsx` RecentList: swap `font-mono {topic_id}` for `<TopicLabel id=... />`.
- Any "canonical" / "emit" / "lineage" / "replay" / "escalation" wording in the **Today, Command Center, Digest, Forecast** trees (already-touched files only) is replaced per §2.
- Owner/admin pages, `/asb/*`, `/replay/*`, `/ops/*`, edge functions, tests, and `docs/` keep their existing technical vocabulary.

---

## 4. Out of scope (explicitly unchanged)

- `src/lib/asb/*`, `src/lib/command/projections.ts`, `src/lib/runtime/*`, `src/hooks/command/*`, `useAsbTimeline`, `asb_events` schema, edge functions, migrations.
- TrustFooter signal wiring, capability gates, parity matrix, replay determinism, CI rules, engine_version semantics.
- Topic IDs, payload shapes, projection logic, missingness classification thresholds.
- Coach/owner/ops/replay surfaces.

---

## 5. Verification

- Visual: `/today` first screen reads as one "how your body is doing today" surface with PulseStrip + CC fused.
- Text: no `font-mono` topic IDs, no "canonical / emit / lineage / replay / escalation / engine vX" visible on `/today`, `/command`, `/digest`, `/forecast`.
- Behavior: ConfidencePill / MissingnessChip / LineageDrilldownButton still receive the same props and still link to `/replay/:id` — only labels change.
- Tests: no test files touched; existing parity/replay/invariant suites continue to pass since projections and topic IDs are untouched.

---

### Files affected (UI strings + Today layout only)

- `src/pages/Today.tsx`
- `src/components/command/CommandCenterSection.tsx`
- `src/components/command/TodayOverviewHeader.tsx`
- `src/components/command/EscalationBanner.tsx`
- `src/components/command/ConfidencePill.tsx`
- `src/components/command/MissingnessChip.tsx`
- `src/components/command/LineageDrilldownButton.tsx`
- `src/components/command/IntelligenceCardShell.tsx`
- `src/components/command/cards/ReadinessCard.tsx`
- `src/components/command/cards/FatigueCard.tsx`
- `src/components/command/cards/RecoveryCard.tsx`
- `src/components/command/cards/WorkloadCard.tsx`
- `src/components/command/cards/SchedulingLoadCard.tsx`
- `src/components/command/cards/EscalationFlagsCard.tsx`
- `src/components/runtime/TrustFooter.tsx`
