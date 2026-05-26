## Goal
Replace raw canonical `topic_id` strings shown in the Weekly Digest with human-readable labels via the existing `TopicLabel` / `topicLabel()` helpers, while keeping raw IDs visible as captions/tooltips so replay lineage stays one click away.

## Raw text found
1. **`MissingSignalCard.tsx`** — chip list renders raw `topic_id` (e.g. `behavioral.fatigue.acute`) in mono font.
2. **`DigestTimelineStrip.tsx`** — each spine chip shows raw `r.topic_id` as its main text.
3. **`sentences.ts` → `missingSignalSentence`** — single-topic case interpolates the raw id: `1 tracked topic emitted no events this week (behavioral.fatigue.acute).`

Card titles, sentences, header copy, badges (`conf`, `live/partial/stale/no signal`), and the engine badge are already humanized (engine badge was fixed earlier) — no changes needed there.

## Changes

**1. `src/components/digest/MissingSignalCard.tsx`**
- Replace each `<Badge>{t}</Badge>` chip with `<TopicLabel id={t} inline />` wrapped in a bordered chip, so the human label is primary and the raw id is the muted caption underneath (matching command center pattern).

**2. `src/components/digest/DigestTimelineStrip.tsx`**
- In each spine link, render the human label via `topicLabel(r.topic_id)` as the main line and keep the raw `topic_id` as a smaller mono caption beneath (or in the existing `title` tooltip, which already includes it).
- Preserve `/replay/:eventId` link and timestamp line.

**3. `src/lib/digest/sentences.ts`**
- In `missingSignalSentence`, drop the raw-id parenthetical and use the human label: `` `1 tracked topic emitted no events this week (${topicLabel(topics[0]).label}).` ``. Import from `@/lib/asb/topicLabels`.
- Same humanization applies to `continuationSentence`, `escalationPersistenceSentence`, and `missingnessProjectionSentence` only if called with a raw topic id; reviewing callers shows `missingnessProjectionSentence(topic, …)` could receive a raw topic — also pass it through `topicLabel().label`. (No behavioral change if callers already pass human strings.)

## Out of scope
- No changes to projection logic, hooks, ledger writes, or migrations.
- Engineer-facing surfaces (`/timeline`, `/replay/:id`) untouched.
- `EngineVersionBadge` already humanized in earlier turn.

## Verification
- Visit `/digest`, confirm: missing-signal chips read e.g. "Acute fatigue signal" with raw id caption; timeline spine chips read human label with raw id in tooltip; single-topic missing sentence reads human label.
- Replay drilldown still works from every chip.
