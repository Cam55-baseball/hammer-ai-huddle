

# Precision Fix: Difficulty Correction & Mistake Scenario Upgrade

## Current State
- **21 scenarios** globally have `difficulty = 'reaction_time'` (invalid value)
- **4 of those** are in lessons 14–17 (one per lesson)
- Allowed difficulties: `easy`, `game_speed`, `elite`, `mistake`

## Phase 1 — Fix Invalid Difficulty (Global)

Single UPDATE across all 21 scenarios:
```sql
UPDATE baserunning_scenarios SET difficulty = 'mistake' WHERE difficulty = 'reaction_time';
```

## Phase 2 — Global Audit

Verify only 4 allowed values remain.

## Phase 3 — Upgrade Lesson 14–17 Mistake Scenarios

Rewrite scenario_text, options, correct_answer, explanation, wrong_explanations, game_consequence for these 4 scenarios to meet the "realistic bad decision" standard:

| ID | Lesson | Theme |
|---|---|---|
| `e1404...` | 14 (First Step Explosion) | Hesitation on first-step commit costs the play |
| `e1504...` | 15 (Read → Decide → Commit) | Over-reading kills transition speed |
| `e1604...` | 16 (Angle Efficiency) | Wide turn loses the extra base |
| `e1704...` | 17 (No-Hesitation Zone) | Checking up in no-man's land = out |

Each rewritten scenario will have:
- 1 correct answer
- 1 high-level wrong (feels right but loses)
- 1 hesitation-based wrong
- 1 panic-based wrong
- Full wrong_explanations for all 3 incorrect options
- game_consequence showing real cost of the mistake

## Phase 4 — Validation

Return `SELECT DISTINCT difficulty` + 2 full JSON samples.

## Implementation
- 1 global UPDATE for difficulty fix (insert tool)
- 4 individual UPDATEs for scenario content rewrites (insert tool)
- No schema changes, no code changes

