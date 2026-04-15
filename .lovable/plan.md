

# System Intelligence Upgrade: Dedup, Quality, Schema, Code Hardening

## Summary

Five interconnected fixes: (1) reduce slide-into-first from 7→2 scenarios, (2) upgrade generic wrong_explanations, (3) add `mistake_type` column and backfill, (4) add `answer_id` column for stable matching, (5) sport-specific softball rewrites.

---

## 1. Slide-Into-First Reduction (7→2)

**Keep** (1 baseball, 1 softball):
- `f1030001-...-03` (BB) — "Runner slides headfirst into first base on routine grounder"
- `f1030002-...-03` (SB) — "Softball player slides headfirst into first on close play at 60-foot base"

**Rewrite** (5 scenarios → new decision types):

| ID | Current | New Decision Type |
|---|---|---|
| `d2000001-...-12` (BB) | "slides into first, what did they lose" | **Delayed steal read** — Runner at first reads catcher lob-back to pitcher, decides steal window |
| `f1020001-...-04` (BB) | "sprint through or slide" | **Secondary lead timing** — Runner at second with 2-strike count, secondary shuffle vs freeze on swing-and-miss |
| `d2000001-...-16` (SB) | "slides headfirst on bunt play" | **Tag-up depth read** — Runner at third on medium fly, reads fielder momentum for scoring decision |
| `f1020002-...-04` (SB) | "sprint through or slide on bunt" | **First-step reaction vs contact quality** — Runner at first reads bat angle/contact quality for GO/HOLD |
| `d2000001-...-15` (SB) | "why is sliding worse in softball" | **Slap-game delayed steal** — Runner reads catcher's throw-down habits after slap singles |

Each rewritten scenario: 4 options, 3 wrong_explanations, game_consequence, sport-specific context.

## 2. Wrong_Explanation Quality Upgrade

**Flagged scenarios** (generic/dismissive language):
- `d2000001-...-04` — contains "It makes no difference either way"
- Plus full audit of all 75 mistake scenarios for explanations that fail to describe the player's incorrect thought process

**Rewrite standard**: Every wrong_explanation must contain:
- What the player **thought** was correct
- What they **failed to process** (the missed read)
- Why this feels right but loses

Estimated: ~5-8 scenarios need explanation rewrites beyond the 5 already being replaced.

## 3. Schema: Add `mistake_type` Column

Migration:
```sql
CREATE TYPE public.mistake_type AS ENUM ('hesitation', 'misread', 'panic', 'over_aggressive');

ALTER TABLE public.baserunning_scenarios
  ADD COLUMN mistake_type public.mistake_type;
```

Then backfill all 75 mistake scenarios via INSERT tool (UPDATE statements). Classification based on:
- **hesitation**: correct answer involves committing/going, player freezes
- **misread**: player reads wrong cue (fielder position, ball trajectory, count)
- **over_aggressive**: player goes when they should hold/read
- **panic**: player makes snap decision under time pressure without processing

Target: ~25% each (18-19 per type). Return exact distribution after backfill.

## 4. Schema: Add `answer_id` for Stable Matching

Migration:
```sql
ALTER TABLE public.baserunning_scenarios
  ADD COLUMN answer_options jsonb;
-- Format: [{"id": "a", "text": "..."}, {"id": "b", "text": "..."}, ...]
-- correct_answer_id stored as the id value

ALTER TABLE public.baserunning_scenarios
  ADD COLUMN correct_answer_id text;
```

Backfill all 232 scenarios: assign `a`, `b`, `c`, `d` IDs to each option. Set `correct_answer_id` to the matching ID.

**Code changes** in `ScenarioBlock.tsx` and `DailyDecision.tsx`:
- Update `Scenario` interface to include `answer_options` and `correct_answer_id`
- Change `handleSelect` to compare by ID instead of string
- Render option text from `answer_options[].text`
- `wrong_explanations` keyed by answer ID instead of full text string
- Fallback: if `answer_options` is null, fall back to current `options`/`correct_answer` string matching (backward compat)

**Hook changes** in `useBaserunningDaily.ts`:
- Update `DailyScenario` interface

## 5. Sport Intelligence: Softball Rewrites

Query all `sport = 'both'` mistake scenarios and identify those where the decision is identical regardless of sport. For scenarios where softball timing differs meaningfully:
- Add softball-specific versions with 60ft timing windows
- Reference slap game, shorter reaction compression, catcher pop-time differences
- Estimated: 3-5 scenarios need softball-specific variants

---

## Implementation Order

1. **Migration**: `mistake_type` enum + column, `answer_options` jsonb + `correct_answer_id` text (1 migration)
2. **Data: Slide-into-first rewrites** (5 UPDATEs via insert tool)
3. **Data: Wrong_explanation quality fixes** (~8 UPDATEs)
4. **Data: Backfill mistake_type** (75 UPDATEs)
5. **Data: Backfill answer_options + correct_answer_id** (232 UPDATEs)
6. **Code: Refactor ScenarioBlock.tsx** — answer_id matching with fallback
7. **Code: Refactor DailyDecision.tsx** — answer_id matching with fallback
8. **Code: Update useBaserunningDaily.ts** — updated interface
9. **Data: Softball-specific rewrites** (3-5 UPDATEs)
10. **Validation**: Return full distribution counts, 10 random samples, diff list

## Technical Details

- All data operations use the insert tool (UPDATE statements)
- Schema changes via migration tool
- No breaking changes: fallback to string matching if `answer_options` is null
- `wrong_explanations` will be dual-keyed during transition (by answer_id and by text) until full backfill confirms

