# Elite Pitching Development Track — Hammers Today

Goal: give baseball and softball pitchers a professional-grade daily prescription that scales from first-year pitchers to top-tier arms who've plateaued, sitting on top of the existing throwing ladder, roadmap rungs, seasonal quarters, and arm-care budget. Constitutionally additive — no invariants weakened, all outputs replay-safe under `useHammersToday()`.

## What today is missing

- `throwingLadder.ts` prescribes generic throw count + max intent. No bullpen scheduling, no per-week pitch cap, no role (starter/reliever/closer), no innings ramp, no rest-day arithmetic, no PFP (pitcher fielding practice).
- No pitcher-specific card on Hammers Today. Pitchers currently get the same throwing/defense cards as position players.
- No softball vs baseball pitching distinction (windmill mechanics, day-after workload, higher weekly pitch tolerance).
- No pitch-count-to-innings modeling and no pen scheduling (side day, touch-and-feel, bullpen, live, start).

## What we're building

### 1. Pitcher profile (onboarding + settings)
Add a small pitcher block reachable from onboarding and from a "Pitcher settings" pencil on the new card:
- Discipline: baseball / softball (already known via sport)
- Role target: starter / reliever / closer / two-way / undecided
- Level band: youth / HS / travel / college / pro (already in competition level — reused, not re-asked)
- Current innings-per-outing capacity (self-reported, editable)
- Bullpen day-of-week preference
- Pitch arsenal (multi-select), with a "primary" pick

Stored in a new `pitcher_profile` block on `athlete_context` (additive, nullable). Never authored by the engine; athlete/parent/coach only.

### 2. Weekly pitching microcycle engine
New pure module `src/lib/hammer/pitching/pitchingMicrocycle.ts` that, given `{sport, role, rung, quarter, level, pitcherProfile, gpGames, calendarEvents}`, returns a 7-day plan of pitching day-types:

```text
Baseball starter (Peak / In-Season Q):
  Start · Recover · Flush · Bullpen · Touch · Fielding+Long-toss · Start
Baseball reliever:
  Available · Available · Side · Available · Available · Available · Available (capacity-based)
Softball pitcher (higher tolerance):
  Start · Flush · Side · Start · Flush · Side · Start
```

Ladder-aware: Foundation rung caps at "learn to throw a pen"; Bridge unlocks live BP; Peak unlocks starts; Sustain protects the ceiling. Quarter multiplier from `seasonQuarters.ts` scales pitch counts, never mechanics.

### 3. Pitch-count + innings ladder
New `src/lib/hammer/pitching/pitchLadder.ts` producing per-day and per-week caps:
- Per-outing pitch cap (level × role × rung × quarter)
- Weekly pitch cap = sum of scheduled outings under microcycle
- Innings target derived from cap ÷ average-pitches-per-inning by level (validated ranges from Pitch Smart / NCAA / NPF references — conservative, never invented)
- Required rest days after each outing (Pitch Smart-compliant for baseball youth/HS; softball uses conservative day-after protocol)
- "Earn the next tier" gate: bumps require N clean outings + green recovery clock

### 4. Bullpen + throw prescription
Extends `throwingLadder.ts` (does not replace it). On pen days the returned prescription includes:
- Pitch count target, intent %, pitch-type distribution (pulled from arsenal)
- Warm-up throws + long-toss cap (respects arm-care budget)
- Cooldown throws
On non-pen throw days, ladder returns catch-play / touch-and-feel volume tuned to next scheduled outing.

### 5. Pitcher Fielding Practice (PFP) — daily
New small block in the pitching card: 5–10 minute PFP prescription every training day (comebackers, 1–3 cover, 3-1 put-outs, bunt fielding, PFP-53, pickoffs). Content lives in `src/lib/hammer/pitching/pfpLibrary.ts`, tiered Beginner→Expert like the drill library.

### 6. New Hammers Today card: `PitchingCard`
Only mounts when the athlete is a pitcher or two-way. Collapsible, dropdown-chevron style consistent with other cards. Sections:
- Today's role (Start / Bullpen / Side / Touch / Rest / Available)
- Pitch/throw count target + intent %
- Arm-care coordination via `ArmCareBudgetContext` (pitching owns arm care on pen/start days)
- PFP prescription
- Recovery clock until next outing
- Log button (specialized template: pitches thrown by type, velo, strike %, RPE)

Two-way athletes get **both** the position-player throwing card and the pitching card (mirrors the switch-hitter duplication doctrine).

### 7. Coordination with existing systems
- `HammersTodayProvider` remains the single generation entrypoint; pitching prescription is derived inside the same snapshot.
- `dailyPlan.ts` schedule-aware modulation extended: game-day = no bullpen, day-before-start = touch only.
- `weeklyMicrocycle.ts` lifts/speed reads the pitching microcycle so leg-heavy lifts don't land the day before or of a start.
- Season-quarter drift guard already covers phase mismatch; pitching plan inherits it.

### 8. Elite plateau + entry ramps
- Entry ramp: Foundation rung + no self-reported pitching history ⇒ 4-week "learn to throw a pen" onramp (flat-ground → mound intros → first pen).
- Plateau breaker: Peak/Sustain athletes flagged by session logs (velo/strike% flat for 3+ outings) get a "Variance week" prescription — pitch-design bullpen, constraint pens, weighted-ball plyo work (only if arm-care clock is green and rung is Bridge+).

### 9. Logging
Add specialized log templates in `logTemplates.ts`:
- `bullpen` — pitches by type, velo, strike%, feel
- `start` / `outing` — IP, pitch count, K, BB, hits, whiff%, first-pitch strike%
- `pfp` — reps by drill, RPE

### 10. QA
- Unit tests for `pitchingMicrocycle`, `pitchLadder`, PFP rotation (replay-deterministic under fixed inputs, engine_version pinned).
- Extend `hammers-today/variables-matrix.csv` with new pitcher variables.
- Storybook state for `PitchingCard`: baseball starter Q3 Peak, softball starter Q1 Foundation, two-way HS reliever, plateau breaker.

## Files touched

New:
- `src/lib/hammer/pitching/pitchingMicrocycle.ts`
- `src/lib/hammer/pitching/pitchLadder.ts`
- `src/lib/hammer/pitching/pfpLibrary.ts`
- `src/lib/hammer/pitching/pitcherProfile.ts` (types + resolver)
- `src/components/hammer/PitchingCard.tsx`
- Tests under `src/lib/hammer/pitching/__tests__/`

Edited (additive):
- `src/lib/hammer/roadmap/throwingLadder.ts` — pen-aware branch
- `src/components/hammer/HammerDailyPlan.tsx` — mount `PitchingCard`
- `src/components/hammer/logging/logTemplates.ts` — bullpen/outing/pfp templates
- `supabase/functions/wk-generate-daily/index.ts` — surface pitcher fields in snapshot
- `docs/audits/hammers-today/variables-matrix.csv`
- Onboarding: append optional pitcher block after position step

DB migration (additive):
- `athlete_pitcher_profile` table (user_id PK, sport, role_target, arsenal jsonb, innings_capacity, preferred_bullpen_day) with RLS `auth.uid() = user_id`, GRANTs to `authenticated` + `service_role`, `updated_at` trigger.

## Non-goals

- Not changing hitting/lifts/speed engines.
- Not authoring organism truth from log data — logs feed observability only.
- Not auto-scheduling starts on the shared calendar without athlete confirmation.

## Open questions before build

1. For pitch-count caps, do you want strict Pitch Smart limits for baseball youth/HS (safest, defensible) or a slightly athlete-tuned band gated by recovery clock?
2. Softball pitchers — is your default expectation "pitch most days" (typical HS/travel) or a stricter starter/reliever split like baseball?
3. Should two-way athletes see the pitching card by default, or only after they confirm "I pitch this season" in onboarding?
