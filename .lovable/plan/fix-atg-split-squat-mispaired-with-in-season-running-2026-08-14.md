# Fix: ATG Split Squat mispaired with in-season running

## What you spotted is real

You're right on all three counts. Here's what the data actually shows.

There are **four separate "ATG Split Squat" entries** in the movement catalog, and they disagree with each other:

| Slug | Category | Dose | Season legal | Eccentric-flagged |
|---|---|---|---|---|
| `atg_split_squat` | kot | 3x8 | off-season only | yes |
| `lift_atg_split_squat` | strength | 3x8 | in-season too | **no** |
| `kot_atg_split_squat` | kot | 2x8 | in-season too | **no** |
| `sp_atg_split_squat` | speed_lab, named "ATG Split Squat 3x8ea" | 3 sets / 1 rep / unit = **feet** | in-season too | no |

Three real problems fall out of that:

1. **The in-season block is being bypassed.** The seasonal legality gate blocks the exact slug `atg_split_squat` in-season. The three sibling slugs are the same exercise under different names, are not flagged eccentric-dominant, and are not on the block list — so they walk straight through the gate.
2. **It is being used as a warmup for running, and it should not be.** `sp_atg_split_squat` sits in the speed engine's "mobility / prep" pool. That means a loaded, deep-knee-flexion, eccentric-heavy exercise is prescribed *before* sprint work. That blunts tendon stiffness, pre-fatigues the quad and patellar tendon, and is the wrong stimulus ahead of high-velocity running. It is a strength/ROM developer, not a warmup.
3. **Its dosage metadata is corrupted.** `sp_atg_split_squat` carries `dosage_unit = feet` with 1 rep, while its name hardcodes "3x8ea" — so the card renders a nonsense pairing between the name and the prescribed dose.

Meanwhile the in-season strength engine's own dose helper is correctly conservative (1 set x 3 reps in-season). So the 3x8 you saw did not come from the in-season doctrine — it came from raw catalog defaults leaking past it.

## The doctrine we'll enforce (safety first, no capability lost)

- **Deep-ROM loaded knee flexion is never a warmup.** It may only appear in a strength block, and only *after* any running/sprint work in the same day — never before.
- **In-season ATG work is maintenance, not development.** Reduced ROM, low volume, no near-failure: 2 sets x 5 per side, controlled tempo, stopping short of the deepest range. Suppressed entirely within 24h of a game and on high-workload days.
- **Off-season is where the 3x8 full-ROM version lives** — unchanged, because that's where it belongs and it's genuinely elite for knee durability and sprint mechanics.
- **Family-level legality.** Season gating keys off a movement *family*, not a single slug string, so renaming or duplicating an exercise can never smuggle it past a safety gate again.

## Changes

**1. Catalog integrity repair**
- Assign every ATG variant a shared `movement_family = "atg_split_squat"`.
- Flag all variants `is_eccentric_dominant = true`.
- Fix `sp_atg_split_squat`: `dosage_unit = reps`, remove "3x8ea" from the display name, and drop it out of `speed_lab`.
- Re-scope in-season eligibility for the family to the maintenance dose only.

**2. Remove it from the running warmup**
- Delete `sp_atg_split_squat` from the speed engine's mobility/prep pool.
- Replace with a real sprint ramp: ankle/hip CARs, leg swings, A-skips, pogo hops, and progressive build-up runs — elastic and CNS priming, no deep loaded flexion.

**3. Warmup category allowlist**
- Define which categories may ever populate a warmup/prep block. Anything outside it (strength, kot, pap_bridge) is rejected at generation with a logged reason, so no strength movement can slip into a warmup slot in any module.

**4. Season gate by family**
- Update the legality authority to resolve family before checking block lists, and add the eccentric-dominant in-season rule at family level.

**5. Same-day ordering rule**
- Add an interference check: deep-ROM knee-flexion loading is blocked from being sequenced before speed/running work on the same day.

**6. In-season dose override**
- Route the family through the in-season maintenance dose (2x5 per side, ROM-limited) rather than the catalog default, with the "why" text on the card explaining it's durability maintenance, not a development block.

**7. Verification**
- Run the domain/integrity checker across all phases and confirm zero in-season deep-eccentric prescriptions and zero strength movements landing in warmup blocks.

## Technical notes

Files in scope: `supabase/functions/_shared/wic/season.ts` (family resolution + block list), `supabase/functions/_shared/wic/engines/speed.ts` (prep pool), `supabase/functions/_shared/wic/engines/strength.ts` (dose override + ordering rule), a catalog migration for `wk_movement_catalog`, and the integrity checker script. No UI changes required — the cards read from the corrected prescriptions.

## Credit status

This plan is **scoped to finish in one build pass** using the remaining free build credits. If the pass runs out mid-way, the natural stopping point is after items 1-3 (catalog repair + warmup removal), which already resolves the exact mismatch you saw; items 4-7 are the hardening layer and can complete tomorrow on your command. I'll tell you explicitly which state we ended in.
