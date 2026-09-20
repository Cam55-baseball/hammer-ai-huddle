# Hammers Training Intelligence v1
### Exposure · Spacing · Phase · Personalization — doctrine for Hammer's Today

**Status:** DRAFT v1 · 2026-09-20 · pending owner decisions D1–D3 (§3). This file changes nothing on its own. Every build step (§14) ships behind flag `training_intel_v1` (default OFF) and goes live only after acceptance.

**Extends (does not replace):** `docs/wic/lifting-enhancement-plan-v4.md` (every L0 law stands unless §3 amends it with owner sign-off), `docs/wic/weight-room-standards-v1.md`, `docs/wic/lifting-research-inventory.md`, `docs/wic/lifting-system-extraction.md`.

**Sources digested:** Gemini periodization chat (screenshot batch 1); ChatGPT knowledge packages (workload spikes, fast-twitch methods, stretch-shortening/contrast, fascia threads, %1RM table); Lovable batch notes 2–5 (sleds, plyo tiers, surfaces, spacing law, in-season A/B); owner's 2026–27 offseason outline and in-season note page; live code and catalog, read-only, 2026-09-20.

---

## 1. Plain-English summary (owner)

What changes, in 8 steps:

1. **Hammers remembers what each athlete actually did lately** — lifts, sprints, jumps, throws, swings, practices, games — and never lets one day jump far past their biggest day of the last 4 weeks.
2. **Lifts are spaced by how hard they were.** After a heavy day, the next lift waits 3 full days (Mon → Fri). The days between are skills, arm care and mobility.
3. **Jumps grow in 3 steps across the offseason:** easy bouncing → land and hold → fast rebound jumps. Each step is earned by doing the one before it.
4. **Your 6-4-2-4-4 offseason becomes every athlete's offseason shape,** stretched or shrunk to fit their real calendar.
5. **In-season: take away the lowering, keep the heavy.** Isometric pushes, lifts that start from a dead stop, and sleds hold strength without soreness. Daily-game players lift after games (pending D1).
6. **Same principles for everyone.** Age, growth spurts, training age, sex, sport and position change the dose and the menu — never the principles.
7. **Every change comes with one plain sentence** telling the athlete why.
8. **The card always shows up.** Nothing here can remove a card; it can only make a day lighter.

Athletes enter nothing new. Optional only: height once a month for athletes under 18.

---

## 2. The Hammers Training Laws

Evidence grades (one scale replaces the A/B/C and A–E tiers in the source packages):

- **E1 Established** — broad research agreement.
- **E2 Supported** — good evidence; context changes the size of the effect.
- **E3 Hammers method** — owner decision or practitioner rule. Binding doctrine, not claimed as science.
- **E4 Source claim** — recorded only. Never shown to athletes as fact, never drives a rule on its own (§13).

| # | Law | Grade |
|---|---|---|
| TL-1 | Performance first. The weight room serves the field (plan-v4 §0). | owner |
| TL-2 | Recent exposure beats capability. Program from the last 4 weeks, not last season or a personal best. | E2 |
| TL-3 | Workload is workload. Lifts, sprints, jumps, throws, swings, practices and games all count. Practice is never a zero day. | E2 |
| TL-4 | Heavy-lowering work and fast-bounce work are dosed opposite across the year. Eccentric-heavy lifting → absorb-only jumps; light-fast lifting → reactive jumps. Never both peaks at once. | E3 |
| TL-5 | In-season: remove the eccentric, keep the intensity. | E2 |
| TL-6 | Plyos are primers, not workouts: fresh, after the warm-up, before the field or the lift, low volume. Never tacked on tired. | E2 |
| TL-7 | Jump tier and surface advance with the phase, never ahead of it — and each tier is earned by logged work in the tier below. | E3 |
| TL-8 | Spacing is set by what kind of session it was, not by the calendar. | E3 |
| TL-9 | Explosive reps count only while they are explosive. Loud landings, slow contacts or broken form end the set. | E2 |
| TL-10 | One set of principles for every athlete; age, maturity, training age, sex, sport and position change dose and menu. | E1/E2 |
| TL-11 | Reduce, never remove. Every governor trims toward the envelope floor or steps down a tier; the card always ships (L0.1). | owner |
| TL-12 | Say why. Every adjustment writes one plain sentence the athlete sees. Never a silent change. | owner |

Why TL-5 works: next-day soreness comes mainly from eccentric (lowering) work [E1], and low-volume, high-intensity work maintains strength in-season [E2]. Dead-stop and concentric-only lifts, overcoming isometrics and sled pushes carry high force at low eccentric cost.

### 2.1 Order of operations for one athlete-day

1. Season dates → block and phase (§7) → the legal pool.
2. Personal gates (§10): age, Growth Mode, heavy-eligibility, sex, sport, position → narrow the pool, pick the method.
3. Offseason: session class + spacing (§6) → is a lift allowed today, and how hard. In-season: §9 + game_proximity_v2 → timing, primer caps, start protections.
4. Selection and ordering (existing selector; Stage 5 tracks only re-order).
5. Dose — `resolveDose()` only — then the wave re-clamp (BUG-7).
6. Exposure governor (§5) → trims or tier step-downs.
7. Validation → Safe Plan ladder (L0.1).
8. Persist (computation-free) → card with a day label and one "why" sentence per change.

---

## 3. Owner decisions — conflicts with approved rules
**RESOLVED 2026-09-20 — see docs/wic/tissue-cost-scheduler-v1.md §0.** D1: in-season, all athletes lift post-game; in every phase, lift after skill work; rest days calculated (3 full rest days = safe default). D2: calculated on the fly by the Tissue Cost Scheduler. D3: option A.

Nothing in this section is built until the owner answers.

**D1 — In-season lifting after games ("Daily-Games Mode").**
Conflict: plan-v4 L0.3 (never on a game day; nothing above primer within 48 h of a game; max 2 lifts per week) and game_proximity_v2 (at high density, game days get a primer). Owner's in-season plan: lift post-game only, alternating Lift A / Lift B every 3rd day.
- **(A) Recommended.** Daily-Games Mode turns on only when all are true: 5+ game days in the past 7 AND 5+ in the next 7 (deduped by game_proximity_v2 — the two-week test keeps a single tournament weekend from triggering it); age 16+; training age advanced, elite or professional; no active pain flag. In the mode: post-game A/B every 3rd day (§9.3), ≤25 min, ≤4 movements + arm care, no eccentric_overload rows, no deep_flexion rows except the short-range split squat (`kot_atg_split_squat`, already in-season legal; low volume; for catchers, dosed by games caught (tissue-cost-scheduler-v1.1 §5)), RIR ≥3, no novelty. Up to 3 lifts in any 7 days only in this mode; everyone else keeps max 2. Starting-pitcher protections untouched.
- (B) Same, for every in-season athlete regardless of age or training age.
- (C) Keep current rules (daily-game players get primers on game days and a real session only on off days).

**D2 — Rest after lighter loaded sessions.**
Owner rule: 3 full days between offseason lift sessions (Mon → Fri); 2 days only for pure unloaded tissue sessions.
- **(A) Recommended.** Keep 3 days after Heavy (H) sessions; use 2 full days for Moderate (M) sessions — the loaded-but-not-heavy sessions most 13–15-year-olds and beginners get — so they still lift 2–3×/week, matching youth guidance of 2–3 non-consecutive days per week [E1].
- (B) M sessions also wait 3 days.

**D3 — Depth drops vs depth jumps.**
The outline lists "depth drops" in the banded/velocity block; the batch rules put drops (land, hold 2 s, no rebound) in the double-eccentric block and true depth jumps (instant rebound) only in the banded/velocity block.
- **(A) Recommended.** Drops in B2 Absorb; jumps in B4 Speed & Power. Drops stay in B4 only as the fallback for athletes who have not earned jumps.
- (B) Program drops in B4 as well.

**Blocked until the owner defines them** (plan-v4 Appendix B rule): "Marinovich-style reactive work" (outside program name, undefined — athlete copy never names it); "HFT fascia work" (undefined term on the in-season note page). "KOT/ATG" stay internal slugs only; Appendix D renames stand.

**Dose sign-off:** §8 changes compound envelopes for heavy-eligible athletes only. Per plan-v4 §6.3 that ships with a full before/after dose diff for owner sign-off.

---

## 4. What exists today (verified read-only, 2026-09-20)

**Engine.** `season.ts` (6 phases), `dosage/doctrine.ts` (`DOSE_MATRIX` phase × dose group; sole dose authority), `schedule/gameProximity.ts` v2 (forward-only 48 h; ≥4 games in a rolling 7 days → game-day primer, off-day real session; start protections; "Lift anyway"; zero-exposure invariant).

`wk_periodization_blocks` today:

| phase | display | compound_style | supplemental | speed cadence | CNS cap |
|---|---|---|---|---|---|
| os_q1 | Strength & Capacity | double_eccentric | kot | 48 h | 4 |
| os_q2 | Power Build | double_eccentric | kot | 48 h | 4 |
| os_q3 | Elastic Transfer | eccentric | functional_patterning | 72 h | 3 |
| os_q4 | Sport Sharpen | eccentric | functional_patterning | 72 h | 3 |
| in_season | Strength Primer | concentric | functional_patterning | 96 h | 2 |
| post_season | Decompress | concentric | mixed | 96 h | 2 |

**Stages.** `wk_generation_diagnostics`, 790 active `gov_v1` catalog rows, `wk_fault_signals` and the Stage-4 execution columns on `wk_prescriptions` all exist → Stages 1–4 appear built. Confirm 5–6.

**Drift to resolve along the way.**
- Client `seasonQuarters.ts` slices every phase into fixed 3-week quarters labelled Hypertrophy / Strength / Power / Taper-in; server phases are os_q1–q4 with other names, and pre-season maps to os_q4 only on the server. One resolver must feed both (§7.1).
- `doctrine.ts` `trainingAgeBand()` derives 5 bands from years; the classifier emits 6 (incl. professional) — plan-v4 C2 residue inside the doctrine.
- `wk_periodization_blocks` still carries compound set/rep columns that disagree with `DOSE_MATRIX`. Doctrine wins; mark them display-only or remove them.
- At least two readiness scores exist (`physio_daily_reports.readiness_score`, `hie_snapshots.readiness_score`) besides the WIC daily check-in. Governors must read exactly one.

**Catalog findings — the new rules depend on these tags, so they are fixed first (TI-0).**

| # | Finding | Why it matters |
|---|---|---|
| F1 | 9 active rows are `eccentric_overload = true` and season-legal `in_season`. Two (both Nordic eccentrics) are blocked by `is_eccentric_dominant`. Seven pass `isMovementSeasonLegal()`, which never reads `eccentric_overload`: Altitude Drop 12-18", Altitude drop landing (RSI primer) — also `game_day_legal`; its data says min age 0 and beginner-legal, but the runtime safety floor (`resolveSafetyFloor()`, domainGate.ts:188-195) lifts every eccentric_overload row to 16+/advanced — Depth Drop → Box Jump, Glute-Ham Raise, Nordic Hamstring Curl 3×5 (min age 0), Plyometric Low-Box Landings, Tempo Back Squat 5010. | Confirmed L0.3 gap (V1). No in-season prescription had used one as of 2026-09-20. Fixed in TI-0a-1. |
| F2 | 56 active rows use short vocabulary (`off/pre/in/post`) in `season_eligibility` — incl. the 90/90 ER/IR isometric holds. The gate does an exact match against `os_q1…in_season`. | Likely never legal anywhere (silently dead). Verify loader normalization. |
| F3 | `plyo_depth_jump`: min age 0; legal in all four offseason phases; intermediate allowed; equipment `open_space`. | Breaks the golden rule (depth jumps B4 only) and age safety. |
| F4 | 15 sled rows with overlapping identity; 6 list equipment `bodyweight`. "Resisted Sled Sprint (≤10% BW)" is category `rotation`. "Heavy Sled Push Sprint" is legal os_q1, os_q2, in_season — not os_q3/os_q4. | Athletes without a sled get sled rows; the three sled tools (§8.4) cannot be told apart. |
| F5 | Speed-engine rows (`sp_*`) filed as category `mobility` with dosage unit `feet` — incl. Wall-Drive Isometric, Altitude Drop 12-18", Double-Leg Pogo x20. | Wrong units break dosing and exposure counting. |
| F6 | 73 active rows with `cns_cost ≥ 3` have `min_age_years < 13` (mostly 0). | Most are sprints, skips and med-ball throws that are fine at 13. The concern is the reactive and overload rows (overload rows are already floored at runtime). |
| F7 | 6 names embed a dose ("x20", "3×5", "4×5", "3×20s ea", "x10ea"). | The name can contradict the doctrine's dose on the card. |
| F8 | Light-Ball Rotational Wall Rebounds and Med Ball Rebounder Rapid-Fire: `training_age_legality` = professional only. | Ideal in-season elastic primers, unreachable for 5 of 6 bands. |
| F9 | "Triphasic Iso Squat 3s" carries an outside program name. | No-outside-branding rule. |

**Data already available — no new athlete input needed:** `profiles` (sex, height, date_of_birth); `physio_health_profiles` (biological_sex); `athlete_context` (lifting_age_years, competition_level, positions, school_grade, weekly_availability_days, other_sports); `athlete_mpi_settings` (sport; pre-season, in-season, post-season dates); `wk_session_logs` (sets, reps, load, RPE, distance, total reps); `throwing_reps`; `scheduled_practice_sessions` (practice_kind, intensity, duration_minutes); `gp_games`, `calendar_events`; `wk_cns_ledger`; `speed_sessions`, `sprint_analyses`.

---

## 5. Exposure Ledger and Spike Governor (TL-2, TL-3)

**Evidence.** A 2025 BJSM cohort of 5,205 adult runners (Frandsen et al., BJSM 59(17):1203–1210) found that one session more than 10% longer than the longest run of the prior 30 days raised the overuse-injury rate (>10–30%: HRR 1.64; >30–100%: 1.52; >100%: 2.28), while week-to-week change showed no relationship. That is adult running (mean age 46): E2 for sprint distance, E3 when extended to jumps, throws and swings in teenage athletes. The constants below are configurable, not law.

### 5.1 Channels — never added together into one number

| Channel | Unit | Split by | Sources |
|---|---|---|---|
| LIFT | hard sets | main compound vs other | wk_prescriptions, wk_session_logs |
| JUMP | ground contacts (reps × contacts_per_rep) | tier T1 / T2 / T3 | wk_session_logs; pre-game primers |
| SPRINT | yards at ≥90% effort; resisted yards | max velocity / acceleration / resisted | wk_session_logs, speed_sessions |
| THROW | throws | high intent (pitching, bullpens, pulldowns) / moderate (long toss) / low (catch play) | throwing_reps, logged game pitches |
| SWING | high-intent swings | — | where logged; otherwise practice proxy |
| SPORT | practice minutes × intensity; games | practice_kind; catcher innings | scheduled_practice_sessions, gp_games, calendar_events |

### 5.2 Recent Max (RM28)
The largest single-day total in a channel (and tier) in the 28 days before today. Weekly shape uses a 7-day window.

### 5.3 Governor (after `resolveDose()` and the wave re-clamp, before validation)
- planned(today) = today's Hammers prescription in that channel + known sport load today.
- **Build ratio 1.10 × RM28** in build blocks (B1, B2, B4). **Maintain ratio 1.00 × RM28** in-season, in B5 and in Growth Mode — building volume is the danger, holding it is not. In B3 Sport Ramp, LIFT, JUMP and SPRINT hold at 1.00 while THROW and SWING keep the build ratio (that block exists to build sport volume).
- Over the ratio → trim Hammers' own rows only (never team practice): (1) remove sets toward the envelope floor; (2) still over → step down one tier in the same substitution family; (3) still over → drop the row. The Safe Plan ladder keeps the card.
- No two build days in a row in the same channel.
- Cold start (nothing in the channel for 28 days): envelope floor at the lowest phase-legal tier; that session becomes the new RM28. A never-done movement starts at the floor.
- THROW, baseball ages 13–22, when game pitches are logged: Pitch Smart hard caps (§10.4). Required rest days block any Hammers-prescribed pitching or high-intent throwing.
- Deterministic and version-stamped (`exposure_governor_v1`). Every trim writes its reason to `why_v2` and `wk_generation_diagnostics`.
- Persist daily totals in `wk_exposure_daily (user_id, date, channel, tier, total, sources jsonb)`. The client renders it; it never recomputes (BUG-9 rule).

Card copy: "Jumps capped at 40 today — your biggest jump day in the last 4 weeks was 36." · "Sprints restart easy — none logged in 3 weeks."

---

## 6. Session classes and the Spacing Law (TL-8)

### 6.1 Classes (computed after governors run)

| Class | A lift-slot session is this class if… |
|---|---|
| **H — Heavy** | any main compound under `heavy_triples`, `double_eccentric` or `banded_velocity`; any `eccentric_overload` row; any Tier-3 jump; or any row with `cns_cost ≥ 4` |
| **M — Moderate** | not H, and any externally loaded row, any row with `cns_cost ≥ 2`, or any Tier-2 jump |
| **L — Light tissue** | every row is bodyweight or band tissue work (KOT-style) with `cns_cost ≤ 1` and jump tier ≤ 1 |
| **Not a lift session** | Recovery Flow (mobility, arm care, movement prep) and Primers (primer-only intensity, pre-game elastic micro-dose). No spacing effect; allowed daily |

### 6.2 Rest days (offseason and post-season)
Superseded by the Tissue Cost Scheduler (docs/wic/tissue-cost-scheduler-v1.md). These values are now its floors, not fixed gaps.
- Full rest days required between two lift sessions = the larger requirement of the two. **H = 3 · M = 2** (D2-A; 3 under D2-B) **· L = 2.**
- "Days between" = calendar days strictly between the two session dates, in the athlete's local time. Mon → Fri = 3. Allowed when (next date − last date) ≥ requirement + 1.
- The last prescribed session counts as done unless the athlete marks it skipped (fail-safe: an athlete who never logs cannot collect a heavy day every day). A skipped lift moves to the next allowed day; it never stacks.
- A day that cannot host a lift gets the **Recovery & Tissue** card: "Heavy day was Monday. Next heavy day: Friday. Today: skills, arm care, mobility."
- No override stacks heavy days. The athlete may add an L tissue session when spacing allows it.
- game_proximity_v2 applies on top. In-season uses §9, not this table.

### 6.3 Same-day order
Warm-up → elastic primer → sprints / jumps → skill (hitting, throwing) → lift → recovery flow. Skill comes before the lift whenever both fall on one day (L0.2, L0.4). Deep knee flexion never before running (existing `season.ts` rule).

### 6.4 High-low placement
Tier-3 jumps and max-velocity sprints go on H lift days before the lift, or at least 48 h from the nearest H lift — never on the day after an H lift.

---

## 7. The Offseason Arc (owner's 6-4-2-4-4)

### 7.1 Blocks scale to each athlete's real offseason
From the end of post-season to the first game. If pre-season dates exist, B5 = the pre-season window and B1–B4 fill the time before it. One pure resolver in `_shared` with a byte-identical client mirror replaces `quartersFromWeeks()` for the offseason.

| Block | Owner weeks | Share | Phase key | Athlete label | Aim |
|---|---|---|---|---|---|
| B1 | 6 | 30% | os_q1 | Build the Base | tissue capacity + heavy triples |
| B2 | 4 | 20% | os_q2 | Absorb | double eccentric + land and hold |
| B3 | 2 | 10% | os_q2 (sport weeks) | Sport Ramp | skill volume climbs; lifting at maintain dose |
| B4 | 4 | 20% | os_q3 | Speed & Power | banded velocity + reactive jumps |
| B5 | 4 | 20% | os_q4 / pre-season | Sharpen | overcoming isometrics + heavy sled + light jumps |

Scaling for an offseason of W weeks: round share × W, then enforce minimums B1 ≥ 3, B2 ≥ 2, B4 ≥ 2, B5 ≥ 1, borrowing from B3 first, then B1.
- W 12–15: B3 = 1 week. W 8–11: no B3. W < 8: B1 then B5 only; B2 and B4 content stays locked (not enough time to earn it).
- No season dates: current UNSET behaviour (ask for dates; conservative middle dosing).
- B3 resolves dose from the `in_season` envelope (maintain) while legality stays os_q2.

### 7.2 What each block programs
"Foundation" = athletes who are not heavy-eligible (§8.1).

| | B1 Build the Base | B2 Absorb | B3 Sport Ramp | B4 Speed & Power | B5 Sharpen |
|---|---|---|---|---|---|
| Main lift — heavy-eligible | heavy triples 3×3 | double eccentric 3×5 | maintain dose, ≤2/wk | alternate A (heavy 2s–3s, T3 jumps before) and B (banded speed 3×5 + contrast pair) | overcoming isometrics + reduced heavy |
| Main lift — Foundation | today's DOSE_MATRIX | same, tempo 3-1-1-0 | maintain | jumps + med-ball contrast, light loads | isometrics (wall, partner) + light strength |
| Tissue (KOT style) | high-rep 25–100 | continue | low | low volume | low volume |
| Jump tier | T1 only | T1 + T2 | T1 micro-dose | T3 if earned, else T2 | T1 daily; T3 ≤1×/wk if earned (maintain) |
| Surface tip | sand / grass | grass, dirt, turf | any | T3 on firm ground (rubber floor, track, concrete per owner); sprints on grass/dirt | game surface |
| Sled | backward drag, heavy march | heavy push begins | light | resisted acceleration + heavy push | heavy sled runs and pushes |
| Sprint | acceleration technique, short | acceleration + light resisted | ramp with sport | max velocity + acceleration | short, sharp, full rest; baserunning |
| Med ball | extensive (total_reps) | extensive → rotational | light | intensive, 10–20 high-intent | intensive, low count |
| Out | T2/T3, altitude landings, max-intent jumps, double eccentric | T3, banded velocity | double eccentric, T3 | double eccentric, eccentric_overload lifts, new heavy max work | novelty, eccentric overload, volume builds |

Contrast pairs for B4 (heavy-eligible): squat → jump; trap bar → broad jump; split squat → split jump; landmine press → med-ball chest pass. Full rest between pairs — power, not conditioning.

### 7.3 Jump tiers

| Tier | What | Catalog examples | Phases | Age / training age | Earned by | Surface |
|---|---|---|---|---|---|---|
| T1 extensive / landing skill | low, rhythmic, sub-max; land and stick ≤12 in | pogo hops, lateral pogo, single-leg pogo, low-box landings, skips, hurdle rhythm | all, incl. in-season micro-dose | 13+ | — | sand / grass |
| T2 absorption | drop and hold 2 s, no rebound | altitude landing (12–24 in at 16+; ≤12 in at 14–15); single-leg drop once bilateral is clean | B2; fallback in B4–B5 | 14+, intermediate+ | ≥6 T1 sessions in the last 8 weeks | grass / turf |
| T3 reactive | drop and rebound fast, short contact | depth jump, depth drop to broad jump, continuous hurdle jump, reactive bounds, band-assisted jump | B4 (+ B5 maintain) | 16+, advanced+ | ≥6 T2 sessions in the last 10 weeks; no pain flag in 14 days | firm |

In-season and post-season: T1 only. Growth Mode: T1 only.
Re-tags: Plyometric Low-Box Landings → T1, `eccentric_overload = false` (≤12 in land-and-stick is landing skill, not overload). Altitude drop landing (RSI primer) → T2: off game days, out of warm-ups, not in-season (or rename and re-scope it to a ≤12 in T1 snap-down).

### 7.4 Quality gate (TL-9)
T2, T3 and max-sprint rows carry: "Stop the set if landings get loud, contacts get slow, or form breaks." A "stopped early" tap logs the real count; the ledger counts what was done. A ground-contact-time number appears only after it passes the 5-gate accuracy protocol; "under 0.2 s" is a coaching cue, never a graded threshold.

---

## 8. Loading methods — doctrine v2 (dose authority unchanged)

### 8.1 Heavy-eligible
Age ≥ 16 AND training age advanced / elite / professional AND not in Growth Mode AND no active pain flag. This matches the existing barbell gate (loaded barbell spinal work opens at 16 + advanced). Everyone else is on the **Foundation track = today's DOSE_MATRIX, unchanged** — the smallest possible dose diff.

### 8.2 compound_style values (`wk_periodization_blocks` + doctrine)
- `heavy_triples` — new (B1; in-season Lift A)
- `double_eccentric` — exists; moves out of os_q1 to os_q2 only
- `banded_velocity` — new (B4; in-season Lift B)
- `overcoming_isometric` — new (B5; Lift A opener)
- `concentric` — exists (in-season default)
- `eccentric` — retired from os_q3/os_q4; kept for Foundation tempo work

### 8.3 Method envelopes (main compound, heavy-eligible only)
Ceilings equal the owner's numbers; less-trained bands sit lower through the existing band position.

| Method | Sets | Reps / efforts | Load, in the athlete's words | Tempo |
|---|---|---|---|---|
| heavy_triples — offseason | 3 | 3 | a weight you could lift 6–8 times (≈80–85%) | 2-0-1-0 or dead-stop |
| heavy_triples — in-season Lift A | 2–3 | 3 | a weight you could lift 6–8 times; always leave 3+ in the tank (L0.3) | concentric / dead-stop |
| double_eccentric | 2–3 | 4–5 | a weight you could lift 7–8 times | 4-2-1-0 (existing mapping) |
| banded_velocity — offseason | 3–4 | 3–5 | about half your max plus bands; move it as fast as you can | fast |
| banded_velocity — in-season Lift B | 2–3 | 3 | same | fast |
| overcoming_isometric | 2–4 sets | 3–5 efforts | push or pull into pins or a wall as hard as you can: 3–5 s (max force) or 2 s (fast force); full rest | — |

Source ceilings for isometrics: fast-force 4 × 4 × 2 s; max-force 3 × 5 × 4 s. In-season sits at the floor. Cards speak the plain-English column (reps in reserve first); %1RM appears only as a small secondary label for heavy-eligible athletes who have a logged estimate.

### 8.4 Distance- and time-dosed rows
Sled, sprint and isometric seconds must also resolve through doctrine. Verify where they come from today; if from catalog defaults, move them into doctrine envelopes.

Three sled tools — consolidate the 15 rows into these substitution families; retire duplicates via `superseded_by` (correctness first, prescription count only breaks ties — C3):

| Tool | Job | Dose | Phases |
|---|---|---|---|
| Heavy sled push | power; the in-season heavy signal | 2–3 × 15–20 yd; heavy enough that each push is 5–8 s of hard driving, never a grind to a stop | B2–B5; in-season Lift A |
| Light backward drag | tissue (offseason); recovery flush (in-season) | 3–5 min easy, conversational pace | all |
| Resisted acceleration | speed | light (≤10% BW), 4–6 × 10–20 yd, full rest | B2 (light), B4 |

No sled: heavy push → band-resisted march or partner push → Wall-Drive Isometric. Backward drag → backward walk or backward treadmill. Resisted acceleration → hill or falling-start accelerations.

### 8.5 %1RM table — advisory reference (E3), never a dose source

| %1RM | Reps possible | Total reps per exercise (range) | Main effect |
|---|---|---|---|
| 95–100 | 1–3 | 7 (4–10) | max strength |
| 85–95 | 3–6 | 10 (6–14) | strength |
| 75–85 | 6–10 | 15 (10–20) | hypertrophy + endurance |
| 65–75 | 10–20 | 18 (12–24) | power, endurance, some hypertrophy |
| 55–65 | 20–35 | 24 (18–30) | endurance |
| 45–55 | 35–50+ | 100 (50–150) | endurance |

Use: a CI audit flags any prescription whose load percentage and reps per set are impossible together, or whose heavy-block total reps exceed the range. Tables like this come largely from male lifters, and women are often more fatigue-resistant at the same percentage — another reason cards speak in reps-in-reserve.

---

## 9. In-season

### 9.1 Standard mode
Everyone not in Daily-Games Mode: L0.3 and game_proximity_v2 unchanged. The first lift of the week uses Lift A roles, the second Lift B roles (§9.3), scaled by eligibility.

### 9.2 Pre-game elastic primer — every game day
All athletes except a starting pitcher on his start day (he follows his own pre-game routine). After the team warm-up, before field work, ≤10 minutes: 2–3 × 5 T1 contacts (pogos, lateral pogos, skips, low hops) + 1 × 5 light med-ball throws. Intensity class `elastic` (already survives primer-only). Counts in the JUMP ledger.

### 9.3 Daily-Games Mode (only if D1 approved)
Post-game, every 3rd day, alternating, anchored to the last completed lift. If the rotation day is an off day, lift that day.

| | Lift A — Power Anchor (≤25 min) | Lift B — Velocity Reload (≤25 min) |
|---|---|---|
| 1 | Overcoming isometric 2–3 × 3 × 3 s (pin pull or push; no rack → Wall-Drive Isometric) | Banded speed lift 3 × 3 at about half max + bands (no bands → same lift and load, max speed) |
| 2 | Heavy triples 3 × 3, concentric-dominant (dead-stop trap bar, pin squat concentric only, block pull) | Light backward sled drag, 3–5 min easy (no sled → backward walk) |
| 3 | Heavy sled push 2–3 × 15–20 yd (substitutes §8.4) | Low-volume tissue: short-range split squat (`kot_atg_split_squat`, the one deep-flexion exception; for catchers, dosed by games caught (tissue-cost-scheduler-v1.1 §5)), knee-forward calf raise, tibialis raise |
| 4 | Arm care | Short mobility flow + arm care |

- Starting pitchers (5-day rotation): day after a start = Lift A (lower-body emphasis, no heavy pressing); two days later = Lift B; day before a start = primer only; start day = no lift (existing).
- Relievers who pitched that day: Lift B roles only.
- Catchers: lower main lift is a hinge or trap-bar pattern, never a deep squat; games caught count in the SPORT channel.

### 9.4 Weekly max-velocity touch (position players)
If the SPRINT ledger shows no ≥90% effort in 7 days, offer 2–3 build-ups of 20–30 yd on a non-game day or early on a primer day (hamstring protection; evidence mostly from field sports) [E2]. Offered, never forced in a dense week.

### 9.5 Tournaments and doubleheaders
Existing density and doubleheader rules stand; tournament days = primer + recovery flow only. A single tournament never triggers Daily-Games Mode (two-week density test, D1).

---

## 10. Personalization

### 10.1 Age (app minimum 13)

| Age | Menu | Loading | Jump tiers |
|---|---|---|---|
| 13–14 | bodyweight ladders, DB/KB, bands, landing skill, med ball, sprint technique | Foundation, RIR 3–4; no barbell spinal loading (existing) | T1; T2 ≤12 in at 14 once earned |
| 15 | + light trap bar, landmine, loaded single-leg | Foundation | T1–T2 |
| 16–17 | + barbell spinal work if advanced (existing gate) | method envelopes if heavy-eligible | T3 once earned |
| 18+ | full menu | full | full |

Chronological age sets the floor, training age sets the position inside the envelope, maturity (Growth Mode) can pull back.

### 10.2 Growth Mode (under 18) — concept E2, threshold E3
Optional height check every 4 weeks (store dated entries alongside the existing anthropometrics). Growth of 2 cm (¾ in) or more in about 3 months → Growth Mode for 8 weeks, renewing while growth continues:
- JUMP and SPRINT at the maintain ratio (1.00 × RM28); T1 only.
- Foundation track only; no `eccentric_overload` rows.
- Extra mobility (foot-upward flow, hips, thoracic).
- Knee, heel and hip pain flags count double in the Reload Detector and route to lower impact.

Card: "You're growing fast right now. Bones grow faster than muscles and tendons can keep up, so we hold jumps and heavy loads steady for a few weeks and add mobility."
Girls usually reach their fastest growth about two years before boys, so most female users 13+ are past it; the check still runs for everyone under 18.

### 10.3 Sex-aware rules (`profiles.sex` / `physio_health_profiles.biological_sex`)
- Same principles and menus. Women gain strength and muscle at similar relative rates to men [E1]. No "lite" programming.
- **ACL Shield** — required for female athletes in both sports, recommended for all youth: ≥2 exposures a week, year-round including in-season, inside the warm-up or primer — T1 land-and-stick, lateral deceleration, single-leg landing control, hip and trunk control. Neuromuscular training programs cut ACL injury risk roughly in half in female athletes [E1]. Fits the ≥60% single-leg warm-up law.
- RIR-first dosing for everyone; percentage tables are advisory (§8.5).
- **Standards and grades:** female athletes are compared only to real female benchmarks; none available → record, don't grade. This extends the existing softball rule to female baseball players and to the weight-room standards (Appendix C marks and the L4 destinations are male-derived).
- **Menstrual cycle:** no cycle-phase programming — current evidence does not support phase-based changes and responses are individual [E2]. Symptoms flow through the daily check-in like any low-readiness day. Any cycle or contraceptive data is opt-in, private to the athlete, never visible to coaches, scouts or teams, and never changes a card automatically.
- Repeated bone-stress symptoms, or a reported missed period for 3+ months → the card suggests seeing a doctor or athletic trainer. Hammers never diagnoses.

### 10.4 Sport
**Baseball.** Sprint distances: 10 yd (acceleration test), 30 yd (home to first), 60 yd. THROW is overhand. When game pitches are logged, Pitch Smart (MLB / USA Baseball) applies:

| Age | Daily max (game pitches) | 0 days rest | 1 day | 2 days | 3 days | 4 days | 5 days |
|---|---|---|---|---|---|---|---|
| 13–14 | 95 | 1–20 | 21–35 | 36–50 | 51–65 | 66+ | — |
| 15–16 | 95 | 1–30 | 31–45 | 46–60 | 61–75 | 76+ | — |
| 17–18 | 105 | 1–30 | 31–45 | 46–60 | 61–75 | 76+ | — |
| 19–22 | 120 | 1–30 | 31–45 | 46–60 | 61–80 | 81–105 | 106+ |

Plus: never pitch three days in a row; one game per day; ages 13–14 stay under 100 innings in any 12 months and take at least 4 months off throwing a year (2–3 of them continuous); ages 19–22 take at least 3 months off competitive pitching, including 4 continuous weeks off all overhead throwing. The post-season roadmap shows the throwing break for pitchers.

**Softball.** Sprint distances: 7 yd (acceleration test — owner's combine rule), 20 yd (home to first, 60 ft), 40 yd (two bases). THROW splits windmill pitches from overhand throws. Pitch Smart is baseball-only and never applied to windmill pitching; windmill workload runs on the athlete's own RM28 (§5), never on converted baseball numbers. Windmill pitchers get anterior-shoulder and biceps care in arm care (existing softball windmill rows) and capped heavy pressing in-season. Tournament days = primer + recovery.

**Build order:** sport values ship as config; softball values switch on after the baseball portion is complete (standing rule).

### 10.5 Position and subscription
Pitchers: THROW leads, the start is the anchor, heavy overhead pressing limited in-season, arm care daily. Catchers: deep flexion stays out in-season; hinge-based lower lift. Position players: SPRINT leads; weekly max-velocity touch. 2Way: both — on conflict, pitcher rules win. 5Tool Player, Complete Pitcher and 2Way share one engine; subscription gating is unchanged.

### 10.6 Quality tracks (Stage 5)
Tracks still only re-order an already-legal pool. Blocks decide what is legal, the governor decides how much, the tracks decide what comes first.

---

## 11. Readiness and reload (Stage 6 inputs)
New soft signals for the Reload Detector: governor trims in ≥2 channels within 7 days; quality-gate early stops in ≥3 sessions within 7 days. Governors read one canonical readiness source; the others are display-only.

---

## 12. What the athlete sees
- Day label: Heavy Day · Speed Day · Recovery & Tissue Day · Primer Day · Post-Game Lift A / B.
- One "why" sentence per adjustment, plus a "Next heavy day: Friday" chip.
- Jump rows show their tier and a surface tip ("Best on grass").
- Loads in plain words: "a weight you could lift 6–8 times — do 3."
- Swap buttons (no sled, no bands, no rack) and a one-day Road Trip toggle (bodyweight + bands).
- Stop-the-set cue on T2, T3 and max sprints.

Copy rules: never name outside coaches or programs; never show KOT/ATG/Marinovich; never state fascia or "hydraulic" mechanisms as fact.

Examples:
- "Speed & Power, week 2 — Heavy Day. Banded speed squats and depth jumps. Stop any set where your landings get loud."
- "Recovery & Tissue Day. Your heavy day was Monday; the next one is Friday."
- "Post-Game Lift B · 20 min. Fast and light tonight — you play tomorrow at 1pm."
- "Jumps held steady — you've grown ¾ inch since July."

---

## 13. Claims kept out of the app (E4)
Never shown as fact and never the basis of a rule: a fixed 30% fascial power boost; myofibroblasts tightening fascia before muscle fires; hyaluronan turning solid on impact; fascia "super-hydration"; "tight fascia = explosive"; "more collagen cross-linking is always better"; "slow high-rep work only builds water muscle"; a fixed 48–72 h fascia recovery clock; ground contact under 0.2 s as pass/fail; "sled pushes cause zero soreness" (say "low soreness"); "fast-twitch fibers only work above 85%".

Safe versions kept (E2): connective tissue carries force between muscles; tissues remodel with load; loading speed changes how tissue behaves; how fast force rises matters; pre-tension before explosive effort matters; eccentric, isometric and plyometric work build different qualities; stiffness must stay balanced with mobility; force moves through the whole chain.

---

## 14. Build plan for Lovable

**Standard rules — paste at the top of every step:**
> Read docs/wic/training-intelligence-v1.md and docs/wic/lifting-enhancement-plan-v4.md first. Ship behind flag `training_intel_v1` (default OFF). `doctrine.ts` stays the only dose authority; `wk_persist_prescriptions_atomic` stays computation-free; Hammer's Today always produces a card (L0.1); every adjustment writes one plain-English reason; no new required athlete input. If anything here conflicts with the code or an approved rule, stop and report before changing anything. Prove each step with runtime output, not code claims: the 1,296-cell generation matrix (100% cards), zero fatals in every audit, the dose diff (empty unless the step declares a dose change), a real phone-width screenshot, a rollback rehearsal, and subscription gating re-checked.

| Step | What | Step-specific proof |
|---|---|---|
| **TI-0a-1** Safety hotfix — tighten only (live; enforces existing L0.3, no flag) | Runtime guard: `eccentric_overload` rows never legal in in_season/post_season on any path. Data: those rows lose in-season, post-season and game-day legality; age and training-age data raised to match the runtime safety floor; depth jumps os_q3–os_q4 only, advanced+; gear-dependent speed rows get their gear tags. | zero overload rows in in-season/post-season matrix cells; 100% cards; every changed row listed old → new; revert rehearsed |
| **TI-0a-2** Catalog cleanup (data) | F4 sled consolidation via `superseded_by`; F5 units and categories; F7 strip doses from names; F9 rename; Low-Box Landings tier review; age review of bound, hurdle-hop and overspeed rows with owner sign-off (sprints, skips and med-ball throws stay open at 13); add `plyo_tier`, `contacts_per_rep`, `exposure_channel`, `surface_hint`. | dose diff shown for any unit change; matrix 100% cards |
| **TI-0b** Catalog — loosen, batches of 20 | F2 vocabulary (normalize, or deactivate with a reason, after checking the loader); F8 legality | audits clean and matrix 100% after each batch |
| **TI-1** Exposure Ledger — shadow mode | `wk_exposure_daily` computed at generation and nightly; no card changes | 20 sampled athletes' ledgers match their logs by hand |
| **TI-2** Spike Governor | trims, tier step-downs, build/maintain ratios, cold start, Pitch Smart rest blocks, reasons | RM28 = 36 contacts, plan 60 → ≤39 with reason; a floor above the cap steps down a tier; cold start; the card renders every time |
| **TI-3** Session classes + Spacing Law | classes H/M/L, rest rules, Recovery & Tissue card, next-heavy-day chip, skip carry-over | simulated 6-week offseason never breaks a required gap; chip correct across month and time-zone edges; a skipped lift never stacks |
| **TI-4** Offseason Arc + jump tiers + method-aware doctrine | resolver + client mirror; new compound styles; eligibility gate; declared dose change | block boundaries at W = 6, 8, 12, 16, 20, 30; no T2 in B1; no T3 before B4 or unearned; a 15-year-old never gets a method envelope; full dose diff for owner sign-off |
| **TI-5** In-season | pre-game primer; A/B roles; Daily-Games Mode only if D1 approved | simulated MLB week (6 games + 1 off): lift every 3rd day post-game, alternating, ≤25 min, zero eccentric_overload; start protections intact; one tournament weekend does not trigger the mode; standard in-season still ≤2 lifts/week |
| **TI-6** Personalization + athlete copy | Growth Mode, ACL Shield, female benchmark rule, sport distances, windmill channel, card copy | Growth Mode trigger and copy; a female athlete gets ACL Shield ≥2/week in-season; no female athlete graded on male standards; softball values stay off until switched on |

---

## 15. Source-to-rule map — nothing lost

| Source idea | Outcome | Where |
|---|---|---|
| GPP/KOT 20–30% of the year (8–12 wk) | replaced by owner's B1 = 30% of the offseason | §7 |
| Power development 70–80% of the year | fixed % dropped; arc + in-season maintain | §7, §9 |
| Keep KOT low-volume at peak, never abandon it | kept | §7.2, §9.3 |
| Heavy 3×3 | kept: heavy_triples | §8 |
| Banded / accommodating resistance | kept: banded_velocity | §8 |
| Double eccentric / eccentric overload | kept: B2 only, never in-season | §7, §8 |
| Overcoming isometrics 3–5 s; fast-force 2 s; 4×4×2 s and 3×5×4 s | kept | §8.3, §9.3 |
| In-season plyo micro-dose 2–3 × 5, before field, never tired | kept | TL-6, §9.2 |
| Heavy plyos crush the CNS in-season | kept: T1 only in-season | §7.3 |
| Sleds + isometrics as in-season tools | kept | §9.3 |
| Offseason vs in-season table | kept as tiers and methods | §7, §8 |
| Eccentric vs reactive inverse dosing | kept | TL-4 |
| Heavy vs light sled (cut off in batch 1) | three sled tools | §8.4 |
| Surface ladder; game surface late | kept as tips, no dose effect | §7.2 |
| 3-day spacing; 2 days for unloaded | kept | §6, D2 |
| Post-game A/B every 3rd day | kept pending D1 | §9.3 |
| Depth drop (hold) vs depth jump (rebound) golden rule | kept pending D3 | §7.3 |
| Ground contact < 0.2 s | coaching cue only | §7.4, §13 |
| Fascia / hydraulic / tensegrity / fibroblast claims | E4; safe versions kept | §13 |
| Single-session spikes; workload is workload; recent max | kept | §5 |
| 7/14/28-day windows | 7 and 28 kept; 14 dropped (nothing would read it) | §5 |
| No rigid 10% rule | configurable ratio + context | §5.3 |
| 100 easy reps ≠ 100 max reps | channels split by intent and tier | §5.1 |
| Heavy loads / isometrics / ballistics for fast-twitch output | kept as methods | §8 |
| Ballistics by intent; quality over quantity | kept (med-ball modes, quality gate) | §7.2, §7.4 |
| Soviet %1RM table | advisory audit only | §8.5 |
| Don't program off %1RM alone | reps-in-reserve card language | §8.3 |
| Spread high-neural work across the week | high-low placement + spacing | §6.4 |
| Quality / fatigue gate for explosive work | kept | TL-9 |
| Whole-chain / fascial load redistribution | selection philosophy; chain tags deferred until something reads them | §13 |
| Evidence tiers A/B/C and A–E | unified E1–E4 | §2 |
| Stress vectors | channels | §5 |
| Novelty as a variable | floor on first exposure; no novelty in-season (existing) | §5.3 |
| Training age governs everything | eligibility gate + band position | §8.1, §10 |
| Build vs maintain | 1.10 build / 1.00 maintain | §5.3 |
| Recovery is stimulus-specific | session classes + channels | §6 |
| Contrast pairs (squat → jump) | B4, heavy-eligible | §7.2 |
| Short maximal sprints with full rest ≠ conditioning | sprint channel; conditioning stays separate | §5, §7.2 |
| Fast eccentrics (drop-catch split squat, push jerk, supine chest pass) | optional B4/B5 additions via the Appendix A naming law, owner approval | §7.2 |
| Force in the time available / RFD; pre-tension | kept through methods | §8 |
| Youth version | age table + Growth Mode | §10 |
| Purposeful hypertrophy; sarcoplasmic claims | no hypertrophy block label; claims E4 | §7, §13 |
| KOT is not low-value | tissue capacity in every block | §7.2 |
| Fixed 48–72 h fascia clock | rejected | §13 |
| Primary / secondary / maintenance qualities | existing Stage 5 tracks | §10.6 |
| Responsive stiffness vs restriction | kept; daily mobility pairing | §7.2, §12 |
| Foam rolling "melts" hyaluronan | E4 | §13 |
| Marinovich-style work; HFT fascia work | blocked pending owner definition | §3 |
