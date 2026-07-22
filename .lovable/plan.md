## Elite Bat Speed Expansion — Hammers Today Plan

Same playbook that worked for Speed: expand the library, sharpen the selection engine, and give athletes clearer, contrast-driven progressions from first-timer to pro.

### Current state (verified)
- `wk_movement_catalog` has **13 rotation + 18 rotational_power = 31** bat-speed candidates. Too shallow to serve both beginners and elite pros without repetition, and light on contrast/overload-underload science.
- Bat Speed card is driven by `wk-generate-daily` using `family in ('rotation','rotational_power')` filtered by `season_legality` + `training_age_legality` + WIC ordering.

### Goals
1. Athletes measurably move bat speed / exit velo / power output at every level (Youth → Pro).
2. Session variety and phase-appropriate stimulus so plateaued elites keep progressing.
3. Beginners get safe on-ramps before contrast/overload work.

### Deliverables

**1. Seed ~60 new elite bat-speed movements** across five buckets, each with structured instructions (Setup, Elite Cues, Common Mistakes, Success Markers, Dose):

- **Overload / Underload Contrast (bat & implement)** — heavy-bat/donut, fungo, weighted-knob, underload wood, PVC whip, sledgehammer swings, Axe Trainer, contrast ladders. Sources: Driveline Hitting, Bat Speed Trainer research (Fleisig/DeRenne).
- **Med-Ball Rotational Power** — shot-put throws, scoop tosses, granny throws, side rebounder, split-stance rotational throw, walking rotational toss, half-kneel throw, standing chest-pass rotation. Sources: Cressey, USATF throws coaches.
- **PAP / Contrast Complexes** — trap-bar jump → swing, cable chop → swing, hip-thrust → med-ball throw, hex-bar deadlift → rotational throw. Sources: Verkhoshansky, Westside conjugate.
- **Hip/Pelvis Sequencing (P1/P2/P4 rooted)** — cable hip snap, banded pelvic disassociation, hip-assisted swings, resisted-then-free (French Contrast for swing), half-turn iso holds, Coop DeRenne stride-drive drill. Aligned with Arakawa P3 involuntary rule.
- **Rotational Strength & Anti-Rotation Base** — landmine rotational press, standing cable rotation with pause, Pallof press iso holds, half-kneel chop/lift (FMS), rear-foot elevated Pallof, tall-kneeling anti-rotation press. Sources: Cressey, Boyle, FMS.

Each movement tagged with `season_legality` (in_season kept low-CNS; overload/PAP restricted to preseason + os_q2/q3) and `training_age_legality` (contrast/overload gated to hs_varsity+; med-ball basics open to youth).

**2. Bat Speed engine upgrades (`supabase/functions/wk-generate-daily/index.ts`)**
- Weekly rotation across the 5 buckets so a week hits Sequencing → Med-Ball Power → Overload/Underload → PAP → Anti-Rotation base.
- Beginner rail: force sequencing + med-ball basics for `youth`/`middle_school`/no-baseline athletes; block overload/PAP.
- Elite rail: prioritize contrast complexes + PAP for `hs_varsity`/`college`/`pro` in preseason/os_q2/q3.
- In-season safety: cap CNS cost, prefer sequencing + underload; suppress heavy overload on game days (already schedule-modulated).
- Anti-repetition: don't repeat the same movement within 5 sessions.

**3. Library viewer + export**
- Add Bat Speed tab to `/owner/workouts/library` (`WorkoutLibraryViewer.tsx`) grouped by bucket × quarter × training age.
- Export `hammers-batspeed-library.md` for owner review.

**4. Athlete-facing polish**
- Extend `WkBatSpeedCard` copy so the "Why this movement" line explains the bucket ("Contrast complex — heavy stimulates fast recruitment, then underload frees peak swing velocity") without internal jargon.

### Technical notes
- All new rows inserted via `supabase--insert` (data, not schema). No new tables.
- Legality JSON follows the existing `os_q1/os_q2/os_q3/os_q4/preseason/in_season/post_season/rtp` and `youth/middle_school/hs_jv/hs_varsity/college/pro` shapes already in the catalog.
- Selector changes are additive in `wk-generate-daily`; existing card contract unchanged.
- No changes to onboarding, RLS, or auth.

### Out of scope
- Video demos (would require asset generation — flag separately if wanted).
- Changes to Speed/Lifts/Conditioning libraries.
