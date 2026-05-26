## Goal

Replace the raw, jargon-y strings shown in the Command Center (`/command`) and the onboarding "Event recorded" confirm stage with human-readable labels, while keeping the canonical `topic_id`, `engine_version`, and `event_id` visible as secondary lineage metadata (one click away from replay). No changes to the emission pipeline, projections, or replay paths.

## Where the raw text lives today

- **Onboarding confirm (step 3, `src/pages/AthleteOnboarding.tsx` lines 194–226)**
  - Bare mono `athlete.schedule.day_type`
  - `EngineVersionBadge` rendering `engine asb-1.0.0· schema v1` (no space, no human framing)
  - `event_id: 16ab1cfb-…` shown as a wall of UUID
- **Command Center cards**
  - `EscalationBanner.tsx` — `Most recent: <topic_id>` raw mono
  - `cards/RecentEventsPreview.tsx` — list of raw topic_ids
  - `cards/EscalationFlagsCard.tsx` — raw topic_ids
  - `NotificationBell.tsx` — raw topic_ids per item

## Approach

Add a tiny presentation layer that maps canonical `topic_id`s to human labels. Canonical strings stay in the DOM as captions / tooltips so lineage drilldown remains one interaction away (per the project's replay-visibility rule).

### 1. New: `src/lib/asb/topicLabels.ts`

Pure map + helpers, no I/O:

```ts
export function topicLabel(topicId: string): string
export function topicDescription(topicId: string): string | undefined
```

Covers every topic seeded in `20260526172412_…sql` plus the escalation prefix families (`foundation.pattern.*`, `behavioral.escalation.*`, `behavioral.risk.*`). Examples:

- `athlete.schedule.day_type` → "Day type declared"
- `onboarding.step_completed` → "Onboarding step completed"
- `prescription.daily.rendered` → "Daily prescription rendered"
- `session.block.completed` → "Session block completed"
- prefix `foundation.pattern` → "Foundation pattern flag"
- prefix `behavioral.escalation` → "Behavioral escalation"
- prefix `behavioral.risk` → "Behavioral risk signal"

Fallback: title-case the last segment; if still unknown, return the raw `topic_id`. The raw id is never lost — callers render it as a small caption.

### 2. New: `src/components/command/TopicLabel.tsx`

Small reusable presentational component:

```
<TopicLabel id={topic_id} />
→  Day type declared
    athlete.schedule.day_type          ← muted, font-mono, text-[10px]
```

Variant prop `inline` to render single-line ("Day type declared · `athlete.schedule.day_type`") for the escalation banner.

### 3. Edit `src/pages/AthleteOnboarding.tsx` (step 3 block only)

Restructure the confirm card body:

```
Day type declared                       ← human label, text-sm font-medium
athlete.schedule.day_type               ← muted mono caption
[Engine asb-1.0.0 · schema v1]          ← existing badge, prefixed with "Recorded by"
Event reference  16ab1cfb…f1aed6  📋    ← short id + copy; full id in title attr
```

No changes to handlers, no changes to `goNext()` gating, no changes to `EngineVersionBadge` itself.

### 4. Edit Command Center components

Swap each raw `{topic_id}` render for `<TopicLabel id={r.topic_id} />` (or `inline` variant in the banner):

- `EscalationBanner.tsx` — "Most recent: Behavioral escalation" with mono `topic_id` as caption beneath.
- `cards/RecentEventsPreview.tsx` — human label as primary line, topic_id as `text-[10px]` caption alongside `occurred_at`.
- `cards/EscalationFlagsCard.tsx` — human label per row; keep "replay →" link unchanged.
- `NotificationBell.tsx` — human label per item; keep ack-on-click and the unacked dot unchanged.

The `subtitle` on `EscalationFlagsCard` ("foundation.pattern.* + behavioral.escalation/risk.*") is intentionally engineer-facing meta — leave it alone unless you want it humanized too.

## Files touched

- **new** `src/lib/asb/topicLabels.ts`
- **new** `src/components/command/TopicLabel.tsx`
- **edit** `src/pages/AthleteOnboarding.tsx` (step 3 section only, ~lines 194–226)
- **edit** `src/components/command/EscalationBanner.tsx`
- **edit** `src/components/command/cards/RecentEventsPreview.tsx`
- **edit** `src/components/command/cards/EscalationFlagsCard.tsx`
- **edit** `src/components/command/NotificationBell.tsx`

## Out of scope

- No changes to emission, hooks, projections, replay routes, or migrations.
- `EngineVersionBadge` markup stays as-is (used in 5+ places); the onboarding card just frames it better.
- Engineer-facing surfaces (`/replay/:id`, `/timeline`, owner ops) keep raw ids — that's their job.

## Verification

1. `/onboarding/athlete` → reach step 3 → confirm card shows "Day type declared", short event ref, and properly-spaced engine badge.
2. `/command` → escalation banner, recent activity, escalation flags card, and notification bell all show human labels with raw topic_ids as captions.
3. Replay links still open `/replay/:event_id` unchanged.
4. `bash scripts/check-invariants.sh` still passes (no canonical-event or topic-registry surface touched).
