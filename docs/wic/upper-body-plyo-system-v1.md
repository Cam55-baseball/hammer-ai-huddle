> **Live status (E2E WP6, 2026-09-25 17:45 UTC):** LIVE. ub_plyo_hand_wrist ON (all); own primer slot right after the warm-up; live filter removes tiers the athlete is not cleared for; dose from doc contact caps via doctrine.resolveUbPrimerDose, label computed from final saved dose.

# Upper-Body Plyometric System v1 (UBP)
**Owner-directed, 2026-09-20.** Extends `training-intelligence-v1.md` and the Tissue Cost Scheduler.
**Build order:** new catalog rows inserted **inactive** → review → activate in batches of 20 with matrix proof. Rules are built as pure code with tests, then wired in with TCS stage S4 behind `training_intel_v1`.

---

## 1. Letter key — every family has five versions

| Letter | Plane | Main muscles |
|---|---|---|
| **Base** | push | chest, triceps |
| **A** | horizontal pull | upper back |
| **B** | vertical pull | lats |
| **C** | overhead | shoulders |
| **D** | rotation (added) | throwing and hitting chain |

`≈` marks a version where the owner's exact movement isn't safe or doesn't exist in that plane. It uses the nearest safe equivalent instead.

---

## 2. Tiers — mirror the jump tiers (absorb before reactive)

| Tier | What it is | Phases | Age / training age | Earned by | Dose per session |
|---|---|---|---|---|---|
| **U1 rhythmic** | light, fast, sub-max: plyo ball, light med ball, light bands | all phases, incl. in-season and pre-game | 13+ | — | ≤ 40 contacts |
| **U2 absorb** | catch and stick 2 s, or drop → pause | B1–B2 build; B3–B5 maintain | 14+, intermediate+ | ≥ 6 U1 sessions in the last 8 weeks | ≤ 20 catches |
| **U3 reactive / max** | rebound, release, max-intent throw, rapid repeat | B4 build; B5 maintain ≤ 1×/week | 16+, advanced+ | ≥ 6 U2 sessions in the last 10 weeks + strength gate | ≤ 15 reps (≤ 12 for B and C) |

- **In-season and post-season:** U1 only, plus the pre-game primer throws.
- **Growth Mode:** U1 only.
- **Sex:** same gates and doses.

---

## 3. Strength gates — read from logs, never asked

If a gate isn't met, or nothing is logged, the athlete gets the regression, labelled simply "Today's version". There is never a blank slot and never a "you failed" message.

| Family | Unlocks U2 | Unlocks U3 |
|---|---|---|
| Push (Base) | 10 strict push-ups | 20 strict push-ups, or bench estimated max ≥ 1.0 × body weight |
| Row (A) | 10 strict inverted rows | 15 strict inverted rows |
| Pull-up (B) | 6 strict pull-ups | 10 strict pull-ups (band-assisted versions until then) |
| Overhead (C) | 10 strict push-ups + 4 weeks of landmine pressing with no pain flag | bench estimated max ≥ 1.0 × body weight or 20 strict push-ups, plus landmine press logged ≥ 3×8; landmine versions for everyone; true vertical barbell versions only for position players, 16+, advanced+ |
| Bench catch (11) | — | bench estimated max ≥ 1.0 × body weight; Smith machine or safety pins required; load 30–40% of estimated max |

---

## 4. Throwing-arm rules (baseball pitchers and softball windmill pitchers)

- Upper-body plyos feed the scheduler's **Arm** and **Nerve** tanks.
  - U1: Nerve 1 / Arm 1 per 10 contacts
  - U2: Nerve 2 / Arm 3 per 10
  - U3: Nerve 5 / Arm 5 per 10
  - All E3 and tunable.
- **Starting pitchers:** no U2 or U3 on start day, the day before, or the day after. U1 arm care is allowed.
- **No U3 on a bullpen or high-intent throwing day,** and none within 48 h before the next bullpen or start.
- **Overhead (C) for pitchers:** landmine versions only. No barbell overhead catches.
- **In-season pitchers:** U1 only.
- **Pitch Smart:** unchanged.

---

## 5. Dose, order, quality

**Order.** Warm-up → skill work → upper-body plyos (primer or contrast) → lift.

**Rest.** Full rest, 60–90 s between sets.

**Quality gate — stop the set when any of these appears:**
- a slow catch
- loud hands
- elbows flaring
- hips sagging
- shoulders shrugging
- the brace breaking

**Weekly limits.**
- ≤ 2 U2/U3 sessions per week.
- New exposure channel `UB_PLYO` (contacts by tier), under the spike governor like every other channel.

**Contrast pairs** (B4, heavy-eligible):
- bench → plyo push-up
- row → band snap row
- pull-up → band snap-down
- landmine press → landmine plyo press

---

## 6. The families

**1 — Drop catch** · U2
- Base: Push-up drop catch
- A: Inverted-row drop catch
- B: Pull-up drop catch (band-assisted first)
- C: Landmine press drop catch
- D: Half-kneeling landmine rotation drop catch

**2 — Plyometric** · U3
- Base: Plyo push-up (incline → floor)
- A: Plyo inverted row (release and re-grip)
- B: Plyo pull-up (release and re-grip; band-assisted first)
- C: Landmine plyo press (release and catch)
- D: Landmine rotational punch-throw

**3 — Drop → pause 2 s → explode** · U2 → U3 bridge
- Base: Push-up → clap
- A: Inverted row → release-clap
- B: Pull-up, mid-hang pause → explosive pull
- C: Landmine press → explosive press
- D: Med-ball rotational catch → pause → throw

**4 — Partner drop, overhead** · U2 / U3
- Base: Seated overhead med-ball catch → vertical press-throw
- A: ≈ Prone plyo-ball reverse catch → throw
- B: Overhead catch → slam
- C: Single-arm overhead plyo-ball catch → press-throw (light)
- D: Rotational catch → shot-put throw

**5 — Partner drop, chest** · U3
- Base: Supine chest catch → press-throw
- A: ≈ Band overspeed row (band snaps the arms forward; brake, then pull back hard)
- B: Supine pullover catch → throw
- C: Incline (45°) catch → press-throw
- D: Seated rotational catch → throw

**6 — Rapid sled strap press** (owner's "sled slingshot press", renamed) · U3
- Base: Sled strap rapid press
- A: Sled strap rapid row
- B: ≈ Band rapid pull-down
- C: ≈ Landmine rapid press
- D: Sled strap rotational punch

**7 — Banded prowler catch → press** · U3
- Base: Prowler catch → press
- A: Strap sled catch → row
- B: ≈ Band pull-down catch → drive
- C: High-handle prowler catch → press
- D: Prowler catch → rotational press

**8 — Banded prowler catch (stick)** · U2
- Base: Prowler catch and stick
- A: Strap sled catch and stick
- B: ≈ Band pull-down catch and stick
- C: High-handle prowler catch and stick
- D: Rotational band catch and stick (anti-rotation)

**9 — Max repeat med-ball wall throws** · U3 (a light version counts as U1)
- Base: Repeat chest pass
- A: ≈ Rapid band rebound row
- B: Repeat overhead slam
- C: Repeat overhead wall throw
- D: Repeat rotational scoop or shot-put throw

**10 — Max med-ball catch** (partner throws, athlete sticks it) · U2
- Base: Chest catch and stick
- A: ≈ Behind-body plyo-ball catch and stick
- B: Overhead catch and stick
- C: Single-arm overhead plyo-ball catch and stick (light)
- D: Rotational catch and stick

**11 — Max bench catch** (Smith machine or pins; 30–40%) · U3
- Base: Bench drop catch
- A: Chest-supported row drop catch
- B: ≈ Cable pull-down rapid rebound
- C: ≈ Seated landmine drop catch (Smith short-range overhead catch only for position players, 16+, advanced+)
- D: Landmine rotation catch

**12 — Single-arm band snaps** · U1 / U2
- Base: Single-arm band punch snap
- A: Single-arm band snap row
- B: **Single-arm band snap-down** (owner's original)
- C: Single-arm band overhead snap (Y pattern)
- D: Single-arm band chop snap

**Added families**

**13 — Arm-care reactive** (all throwers, all phases) · U1
- Base: —
- A: Prone plyo-ball drops (T and Y)
- B: 90/90 reverse plyo-ball throws to the wall
- C: Overhead wall dribbles
- D: Rebounder deceleration catches

**14 — Rhythmic med ball** (warm-up and primer) · U1
- Base: Wall chest-pass rhythm
- A: Band rebound row rhythm
- B: Overhead wall dribble
- C: Light overhead rhythm throws
- D: Rotational wall rhythm

**15 — Iso → explode** (pre-tension) · U2
- Base: Push-up bottom hold 3 s → explode
- A: Inverted-row hold 3 s → release row
- B: Pull-up mid-hang hold 3 s → explode
- C: Landmine press hold 3 s → explode
- D: Band rotation hold 3 s → throw

**16 — Contrast pairs** (B4, heavy-eligible) · U3
- Base: Bench → plyo push-up
- A: Row → band snap row
- B: Pull-up → band snap-down
- C: Landmine press → landmine plyo press
- D: Landmine rotation → rotational shot-put

**To confirm with the owner:**
- #6: "slingshot" may be a brand name, so the family is renamed per the no-branding rule. Owner to confirm the movement.
- #7–8: read as a partner- or band-driven prowler coming back into the athlete's hands. Owner to confirm.

---

## 7. Blocks

| Block | Upper-body plyo plan |
|---|---|
| B1 Build the Base | U1; U2 introduced late for eligible athletes |
| B2 Absorb | U2 catches and drop → pause (matches the lower-body absorb block) |
| B3 Sport Ramp | U1 |
| B4 Speed & Power | U3, contrast pairs |
| B5 Sharpen | U3 ≤ 1×/week (maintain), U1 daily |
| In-season | U1 only |

---

## 8. Catalog fields for every new row (inserted inactive)

- `ub_tier`
- `plane`: push / pull_h / pull_v / overhead / rotation
- `exposure_channel` = `UB_PLYO`
- `contacts_per_rep`
- Equipment tags: plyo_ball, med_ball, bands, sled, prowler, landmine, smith_machine / safety_pins, pull_up_bar, low_bar, partner
- `phase_allow`, `season_eligibility`, `season_legality`
- `training_age_legality`, `min_age_years`
- Pitcher-rule flags
- `regression_slug` / `progression_slug` chains, so every row always has a safer fallback
- Cues, including the quality-gate cue
- `cns_cost`
- Names follow the Appendix A naming law, with no outside branding

---

## 9. Tests (added to the TCS two-tier suite)

**Invariants:**
- No U2/U3 in-season.
- No U3 under 16 or below advanced.
- No U2/U3 for a starting pitcher on the start day, the day before, or the day after.
- Pitchers never get barbell overhead catches.
- Strength gates are respected.
- Every locked version always resolves to a legal regression. Never empty.
- Weekly caps hold, and the `UB_PLYO` spike governor holds.

**Golden scenarios:**
- 17-year-old position player in B4
- starting pitcher in B4
- 14-year-old in B2
- in-season reliever
- pro athlete in the offseason
