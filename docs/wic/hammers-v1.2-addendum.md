# Hammers Performance System — v1.2 Addendum
**Owner direction, 2026-09-20 (third round).** Extends `tissue-cost-scheduler-v1.md`, `tissue-cost-scheduler-v1.1-addendum.md` and `upper-body-plyo-system-v1.md`. Same discipline throughout: pure code and tests first, inactive rows before active rows, shadow before live, and every claim proved with runtime output.

---

## A. Calculator calibration fix — "load above your normal"

**Problem found in S2 testing.** The heavy-day thresholds were derived from a Friday with no practice. As a result:
- An athlete who practices every day sits above the Nerve threshold forever (steady state about 16 vs a threshold of 11.5).
- The 5-day ceiling ended up doing all the work.
- The "heavy week" golden came out at 6 rest days instead of 4.

**Fix.** Each tank is judged on load **above the athlete's own normal**.
- `baseline_k` = the steady-state level produced by the athlete's typical daily sport load, computed as `c / (1 − r)` with `r = 0.5^(1/half_life)`. The typical load `c` comes from, in order:
  1. the median non-lift daily cost over the last 28 days
  2. if there's no history, the practices and games on their calendar
  3. if there's nothing, 0
- **Judged level** = max(0, level − baseline).
- **Baseline cap:** the steady state of 120 practice-minutes a day at moderate intensity. Above that, the spike governor and the "load pattern" signal take over, so extreme chronic load can never hide.

**Why this is also the owner's "trends and history" rule.** Normal is personal and moves with the athlete over a 28-day window. Routine load doesn't delay lifts; spikes above routine do.

**Re-derive the reference cases on the same basis.**
- **REF-OFF:** 60-min moderate practice every day Mon–Fri; H lift Monday after practice → next H Friday after practice (3 full rest days).
- **REF-IN, REF-M, REF-L:** as before, using baseline subtraction.

**Heavy-week golden, made precise.** REF-OFF plus one extra 90-min high-intensity practice on Wednesday → next H Saturday (4 rest days). Re-run every golden. Report any divergence; never tune it away.

**Reduce-not-remove fix.** When the ceiling is reached, today's class must drop to the highest allowed lower class. S2 showed this rule not being applied. It becomes new invariant **I10**.

**Test timing.**
- Fast tier finishes in under 10 minutes on every build.
- The 100,000-season sweep is a nightly job only. It is **never waited on inside an agent run.**

---

## B. Onboarding and one-timeline scheduling — the app as one living organism

### B1. Onboarding inputs (all editable later in Settings)

1. **Where you are now.** Phase (offseason, pre-season, in-season, post-season), given as any one of:
   - "days into this phase"
   - the phase start date
   - the block name (Build the Base, Absorb, Sport Ramp, Speed & Power, Sharpen)

   The app back-calculates the rest.
2. **Season dates:** offseason length and first game (existing fields).
3. **Planned off days in the offseason:**
   - a number ("14 days of complete rest") and/or specific dates (vacation, holidays, shutdown weeks)
   - off days are zero-load days: optional mobility only
   - the offseason arc stretches around them; blocks shift and never compress below their minimums
   - off days count as rest in the tanks
4. **Last 4 weeks of training** (quick pickers):
   - overall: none / light / moderate / heavy
   - lifting days per week
   - throwing status: not throwing / catch play / long toss / bullpens / games
   - practices per week

   These seed the tanks and the recent-max values, so starting mid-stream is safe.
5. **On-ramp.** If recent training is none or light, or the athlete is returning after ≥ 14 days off: 2 weeks at the floor of every envelope (3 weeks if ≥ 28 days off), using the cold-start rules. Existing injury-mode rules still apply.

### B2. One timeline, every module
- Season dates, games, practices, calendar events, planned off days and every Hammers session live on **one timeline**, using the existing tables (`athlete_mpi_settings`, `gp_games`, `scheduled_practice_sessions`, `calendar_events`). Add a small `planned_off_days` table only if nothing existing fits.
- **Any change re-plans the next 7 days automatically**, with a reason on the card. Examples: a game added, a rainout, an extra practice, a new off day, travel. "Game added Thursday — heavy day moved to Saturday."
- **Every module reads the same timeline and the same tanks:** lifting, speed, jumps, upper-body plyos, throwing and arm care, hitting, recovery. One change ripples everywhere. That is the "living organism."

### B3. Tests
- Onboarding mid-season lands the right block and day.
- Adding off days never breaks a floor and never leaves a card empty.
- Rainout re-plan.
- Travel across time zones.
- A late-joining athlete with no history.
- A pro athlete joining mid-offseason.

---

## C. Upper-body plyos v1.1 — fascia first

### C1. Owner confirmations
- **#6 — Banded sled press.** The sled is anchored to bands behind it. The athlete presses it away, the band returns it, and the athlete catches it and presses again (reactive). Name: "Banded Sled Press (Rebound)."
- **#7–8 — Prowler catch.** A partner or band sends the prowler back into the athlete's hands. Confirmed as read.

### C2. Lower-body mirror — same session demands
Upper-body sessions use the same tiers, contact counting, absorb → reactive order, quality gate and "surface" idea (hand surfaces: wall → padded/turf → hard floor).

| Lower-body drill | Upper-body mirror | Tier |
|---|---|---|
| Pogo hops | Wrist wall pogos → incline → kneeling floor → floor | U1 |
| Lateral pogos / skaters | Lateral hand hops over a line (push-up position) | U1 → U2 |
| Hurdle hops | Hand hops over a low line or mini plate | U2 |
| Depth drop (land and hold) | Drop catch (family 1) | U2 |
| Depth jump (rebound) | Box drop-catch rebound push-up (hands off boxes to floor and back up) | U3 |
| Broad jump | Explosive push-up travel (hands jump forward) | U3 |
| Bounds | Alternating hand bounds (travelling plyo push-up) | U3 |
| Single-leg hops | Single-arm wall pogos → offset-hand plyo push-ups | U2 → U3 |
| Acceleration sprints | Rapid band punches; banded sled press (rebound) | U2 → U3 |
| Isometric → sprint contrast | Iso → explode (family 15) | U2 |

### C3. New bucket — Hand and Wrist Chain (U1 → U2, safety first)

| Drill | Level ladder (easier ← → harder) | Athlete cue |
|---|---|---|
| Wrist wall pogos | standing wall → steeper lean → incline bench → kneeling floor → floor | "Stiff wrists, fingers pulled back, bounce off the heel of the hand." |
| Fingertip wall pogos | upright wall → steeper lean | "Fingers firm, don't let them fold." |
| Finger push-ups | wall → incline → kneeling → floor (all five fingers) | "Slow and solid." |
| Fingertip plank holds | wall → incline → kneeling → floor | "Tall fingers." |
| Plyo-ball wrist snaps (4 directions) | 0.5 kg → 1 kg | "Quick and relaxed." |
| Plate pinch drop-catch | 5 lb → 10 lb, 2-inch drop | "Catch it before it falls." |
| Fingertip wall ball pops | light ball, rhythm | "Fast fingers." |
| Band finger-extension snaps | light band (balances grip) | "Open fast." |
| Grain-bucket hand work | tissue prep, not a plyo | — |

**Safety rules.**
- 13+ get the wall versions only.
- Floor versions need 14+ and intermediate+.
- 3–4 weeks at each level before moving up.
- ≤ 40 contacts per session.
- Reported pain triggers the existing pain rules.
- Pitchers: no max fingertip loading on start day or the day before (protects grip and feel).
- Contacts count in the `UB_PLYO` channel and the Arm tank.

**Cues.** The owner's full cue ("fingers retracted to lock the retinaculum for a fascial effect") is kept in the coach and staff view as Hammers method (E3). Athletes see the plain cue only.

### C4. Fascia-first session order (upper body)
1. Pre-tension (isometric hold)
2. Rhythmic elastic (U1)
3. Catch and absorb (U2)
4. Reactive (U3)
5. Contrast pair

The owner's hydraulic / radial-expansion emphasis is programmed through the pre-tension → explode sequence and loaded isometrics. It is labelled Hammers method (E3) and never stated to athletes as fact.

### C5. Added families

**17 — Plyo-ball wall series** (throwers, sub-max) · U1
- chest pass
- pivot wall throws
- reverse throws
- overhead throws

**18 — Rotational rebounder series** (hitters) · U1 → U3
- scoop
- shot-put
- step-behind throws off a rebounder

**19 — Offset / single-arm push plyos** · U2 → U3
- offset-hand push-up on a med ball
- med-ball crossover plyo push-up
- single-arm wall plyo push

**20 — Assisted / resisted push speed** · U2 → U3
- band-assisted plyo push-up (overspeed)
- band-resisted plyo push-up (strength-speed)

All the rules in UBP v1 §2–§5 apply to families 17–20 and to the Hand and Wrist Chain.

---

## D. Program organization — clean buckets, correct labels, staff-ready

**D1. Canonical bucket tree.** Every catalog row belongs to exactly one bucket and one sub-bucket:

| # | Bucket | Sub-buckets |
|---|---|---|
| 1 | Movement Prep & Tissue | warm-up · mobility · tissue / knee-over-toe · Growth Mode mobility |
| 2 | Lower-Body Elastic | T1 · T2 · T3 · landing & deceleration · ACL Shield |
| 3 | Upper-Body Elastic | U1 · U2 · U3 · families 1–20 |
| 4 | Hand & Wrist Chain | U1 · U2 |
| 5 | Speed | acceleration · max velocity · resisted / assisted · change of direction |
| 6 | Sleds | heavy push · backward drag · resisted acceleration · strap / banded press |
| 7 | Strength | heavy triples · double eccentric · banded velocity · overcoming isometrics · Foundation |
| 8 | Arm Care & Throwing Support | pitchers · windmill · catchers |
| 9 | Med Ball & Rotational Power | extensive · intensive |
| 10 | Recovery & Regeneration | flush · flows |

**D2. Labels on every row.**
- bucket and sub-bucket
- tier
- plane
- method
- phase badges
- age and training-age badges
- equipment icons
- pitcher / catcher flags
- the evidence grade of the rule that governs it

**D3. Staff View** (build after TCS S4). A read-only page, exportable to PDF, showing for each athlete:
- current block and day
- the next 14 days
- every change and its reason
- tank trends
- bucket totals per week
- rules applied, with evidence grades

The staff edition of the program guide is generated **from the live system**, so every page matches what the app actually does.

**D4. Tests.**
- Every active row has exactly one bucket and sub-bucket.
- No orphan rows, no duplicate names, no unlabelled rows.
- Staff View numbers match the stored decisions exactly.
