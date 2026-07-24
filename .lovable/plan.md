
# Skill-Frequency Ladder — Earn Days Before Volume

## North Star
Hitting, defense, throwing, and baserunning are **everyday sports skills**. The pro standard is 6 days/week (MLB position player, AUSL) with self-regulated intensity. The plan must **stack days first**, then stack volume/intensity — never the reverse.

## What's broken today
`weeklyMicrocycle.ts` hard-codes skill days per season phase without regard to the athlete's earned rung:
- Off-season 5-day: defense only 3 days, baserunning only 2 days
- Youth: defense 3 days, baserunning 2 days
- Nothing progresses those numbers as the athlete earns Foundation → Sustain

Result: an intermediate athlete at "Bridge" still gets baserunning twice a week forever, even though the goal is 6.

## Fix — rung-driven skill day ladder

### 1. New pure module `src/lib/hammer/roadmap/skillFrequencyLadder.ts`

For each of the 4 skill modalities (`hitting`, `throwing`, `defense`, `baserunning`), define **days/week per rung**, monotonically climbing to 6:

```text
                    Foundation  Build  Bridge  Peak  Sustain
hitting                 3         4      5       6       6
throwing (pos)          3         4      5       6       6
throwing (pitcher)      3         4      4       5       5   (bullpen-capped)
defense                 2         3      4       5       6
baserunning             1         2      3       4       6
```

Rules encoded as pure functions:
- **`resolveSkillDaysTarget(rung, modality, position)`** → integer 1–6
- **Injury clamp** — leg injury caps baserunning/defense at ≤2; arm injury caps throwing at ≤2 (already partially handled by existing suppression; we only cap the *target*, we never promote)
- **Training-age clamp** — `liftingAgeYears < 1` or U12 lifecycle band caps every skill at ≤ Bridge target
- **Season phase** — in-season caps intensity but never the day count (skill days can still equal 6, the intensity override drops them to activation/secondary — this is already how in-season works)

### 2. Rewrite `resolveWeeklyTemplate` output

Templates keep their **preferred day slots** (CNS-safe order: e.g., hitting Mon/Tue/Thu/Fri/Sat), but the final `perModality[skill]` array is **sliced/expanded to the ladder target**:

- If target=3 and template lists 5 slots → pick first 3 (highest-priority slots defined per modality: e.g., hitting = Mon/Wed/Fri first, then Tue/Sat, then Thu/Sun).
- If target=6 and template lists 5 → add Sun (or the missing recovery-safe day) as an **activation** dose.

A new field `priorityDayOrder: Partial<Record<ModalityKey, ReadonlyArray<Dow>>>` on each template drives the pick order deterministically — no random selection ever.

### 3. Days-first, then volume — `earnedVolumeMultiplier`

Existing `applyRecoveryWindows` and `throwingLadder` already scale volume. We add one guard in `dailyPlan.ts`:

> Volume/intensity for a modality is only allowed to escalate above its rung baseline when the athlete has hit `skillDaysTarget` days for that modality **for the previous 2 weeks** (queried from `hammer_daily_task_completions`).

Until then, the extra days are added at `activation` intensity. This makes "stack days first, then intensity" mechanical, not aspirational.

### 4. UI surfacing

- `RoadmapExplainerSheet.tsx` — new section: **"Skill days you've earned"** — for each of the 4 skills, show `earnedDaysLast7 / rungTarget → nextRungTarget`, with a one-line "why" per row.
- `WeeklyRoadmapStrip.tsx` — the strip already shows scheduled modalities per day; annotate skill days with a `·activation` badge when they're the earned-but-not-yet-full-intensity day.
- No new pages, no new database tables — we reuse `hammer_daily_task_completions`.

### 5. Drift-proof guardrails

Add to `src/lib/hammer/roadmap/__tests__/determinism.test.ts`:
- Every rung has hitting/throwing/defense/baserunning targets **≥ previous rung** (monotonic).
- `Sustain` targets = 6 for hitting/defense/baserunning (5 for pitcher throwing).
- Injury flags never *raise* the target; they can only lower it.
- `resolveSkillDaysTarget` is pure — same inputs → same output.
- Ladder never emits > 6 days.
- Extra earned days added above baseline are `activation`, never `primary`.

Plus a lint script `scripts/check-skill-frequency-ceiling.ts` (added to `scripts/preflight.sh`) that fails CI if any template exports a skill day array with length > `resolveSkillDaysTarget("sustain", ...)` — locks the 6-day ceiling for eternity.

## Files touched

**New**
- `src/lib/hammer/roadmap/skillFrequencyLadder.ts`
- `scripts/check-skill-frequency-ceiling.ts`

**Edited**
- `src/lib/hammer/prescription/weeklyMicrocycle.ts` — add `priorityDayOrder`, run ladder slice, tag extra days activation
- `src/lib/hammer/prescription/dailyPlan.ts` — pass rung + position + last-14d earned days into microcycle
- `src/components/hammer/RoadmapExplainerSheet.tsx` — earned-days section
- `src/lib/hammer/roadmap/__tests__/determinism.test.ts` — new guards
- `scripts/preflight.sh` — call new lint

## Out of scope
- No changes to lifts/speed/conditioning cadence (those already respect 24/48/72/96h recovery windows and are correctly *not* everyday skills).
- No copy changes elsewhere in the app.
