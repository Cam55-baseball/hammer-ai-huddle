# Standards criteria — sport/role-aware fields, positions, mandatory vs preferred

## What I found first (this changes the approach)

**Item 3 is already done.** State, age, height, weight, grad year and GPA are all live matchable profile fields today (`PROFILE_FIELDS` in `standardFields.ts`). Nothing to build there — I'll only extend the set.

**The bigger, unasked-for problem: the matcher is reading the wrong table for the graded tools that matter most.** Earlier this session the scout form was restructured so per-position defense/arm live in `vault_scout_grade_positions` and per-bat-side hitting/power/plate-discipline live in `vault_scout_grade_bat_sides`. The flat columns on `vault_scout_grades` are only a *primary position / primary side mirror*. The matcher reads only the flat columns — so a standard asking for "Defense ≥ 55 at C" silently grades that athlete's primary position instead, and a switch-hitter's off-side power is invisible to matching entirely. Your item 2 ("defense/arm criteria should follow whichever position(s) were selected") can't work without fixing this, so it's in scope.

**12 grades added this session are not matchable at all:** eye test, hustle, game IQ, mental makeup, plate discipline, pitchability, delivery/arm action, deception, body type/frame, poise/competitiveness, defense as pitcher, hold runners. Plus `is_switch_hitter`.

## Your item 4 — confirming the design before building

Your mandatory/preferred design is right, and I'd build it exactly as described. One clarification I'll implement: a standard with **zero mandatory criteria** must match nobody, same as a standard with zero criteria today. Otherwise an all-preferred standard silently matches every athlete in the system — the single worst failure mode this feature has. Preferred-only standards will be blocked in the UI with a plain explanation.

## Technical plan

### Migration
`org_standards` gains:
- `recruiting_role text not null default 'position_player'` — `position_player` | `pitcher` | `two_way`
- `target_positions text[] not null default '{}'` — empty means "any position"
- `position_match_logic text not null default 'any'` — `any` | `all`

`org_standard_criteria` gains:
- `is_mandatory boolean not null default true` — existing rows keep today's strict behavior

Both with CHECK constraints on the enumerated text values. No new tables, no GRANT changes needed.

### Field catalog (`standardFields.ts`)
Each field gets `roles: ('position_player'|'pitcher')[]` and `sports: ('baseball'|'softball')[]`. Position-player fields: hitting, power, plate discipline, defense, arm, eye test, hustle, game IQ, mental makeup, speed, body type/frame, poise. Pitcher fields: fastball, breaking ball, offspeed, control, delivery, pitchability, delivery/arm action, deception, defense as pitcher, hold runners; rise ball is softball-only, hold runners and defense-as-pitcher are baseball-only. Two-way shows the union. Profile fields always show.

### Position-aware grade resolution (`standardFields.ts` + preview hook)
The preview hook additionally loads `vault_scout_grade_positions` and `vault_scout_grade_bat_sides` joined by `grade_id`. Grade flattening becomes position/side-scoped:
- Defense and arm criteria resolve against the child rows for the standard's selected positions — under `any` logic the athlete's best qualifying position wins, under `all` every selected position must independently pass.
- Hitting, power and plate discipline resolve against bat-side rows; a switch-hitter passes if either side qualifies (a scout targeting one side adds an explicit batting-side criterion).
- When the standard targets any position, flat-column behavior is preserved so nothing regresses.

### Matcher (`standardsMatching.ts`)
`evaluateStandardMatch` gains position/side context and returns, alongside the existing shape:
- `matched` — still requires every **mandatory** criterion to pass
- `preferred_met` / `preferred_total` — tracked, never blocking
- `preferred` results array for display

Missing data stays a fail. Official-sources-only stays. Both are unchanged and covered by existing tests.

### UI (`RecruitingStandards.tsx`)
- New-standard form gains role selection, a multi-select position picker with an "any position" default, and an ALL/ANY toggle that only appears once 2+ positions are chosen.
- The add-requirement field list filters by the standard's sport and role, grouped Profile / Position-player tools / Pitching tools.
- Each criterion row gets a mandatory/preferred toggle, and the list renders in two sections so the strict set reads as the actual gate.
- The running summary sentence becomes "…and preferred: X, Y".
- Match rows show "meets all mandatory criteria, plus 3 of 4 preferred", with the unmet preferred named on expand.
- `duplicateStandard` carries the new columns and the mandatory flag.

### Tests
Extend `src/lib/recruiting/__tests__/` — preferred criteria never block, all-preferred standards match nobody, position ALL vs ANY, switch-hitter side resolution, role/sport field filtering.

## Scope note
This stays inside the existing `StaffOnlyRoute` pre-release gating. The athlete-facing match view gets the preferred count read-only; no new athlete-visible surfaces.
