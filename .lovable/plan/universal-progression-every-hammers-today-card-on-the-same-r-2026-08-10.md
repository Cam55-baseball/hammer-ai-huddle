# Universal Progression: Every Hammers Today Card on the Same Roadmap

Right now only two cards are elite in the way you asked. Confirmed by reading the generator and engines:

- `buildProgressionState` (28-day history from `wk_prescriptions` + `wk_session_logs`) is loaded once but passed into **only** the bat-speed and speed engines.
- Only those two write a `progression` payload, `session_title`, and `re_exposure_violation` into `why_payload`, so only `WkSpeedCard` / `WkBatSpeedCard` render block/week lineage and a target-vs-best goal.
- Lift, conditioning, cross-sport, recovery, arm care, warmup, mobility, pitching, nutrition and mental cards are still selected from season phase + rotation with no history read, no block wave, no re-exposure window, and no personal-best target.
- Progression today is a 4-week wave only. There is no multi-year horizon and no link to daily check-ins or test history.

This plan makes every card progression-native, cross-aware of the other cards, and anchored to a long-horizon athlete roadmap.

## 1. One progression state for the whole day

Extend `ProgressionState` from a single block/week wave into a per-domain state:

- Per domain (`lift`, `speed`, `bat_speed`, `conditioning`, `cross_sport`, `arm_care`, `recovery`, `mobility`, `warmup`, `pitching`, `defense`, `hitting`): block index, week-in-block, phase (accumulate → intensify → peak → deload), last exposure per movement, last dosage/load/velocity/time, completion and RPE trend, personal-best ledger.
- One shared read of a 28-day history window plus a rolling 12-month summary. Still pure and replay-safe: history is input, never a side effect.

## 2. Every engine consumes it

Each engine gains the same three behaviours the explosive engines already have:

- **Shape floor** — a minimum item count per day-kind so no card ever publishes a single vague item.
- **Canonical session sequence** — a named intent and ordered stages (e.g. lifts: prime → main → contrast → accessory → resilience; arm care: mobility → activation → volume → decel; conditioning: prep → work → repeat-quality → flush).
- **Re-exposure control + progression vehicle** — a movement repeats only when it is the progression vehicle; otherwise rotate inside the family for the same adaptation.

## 3. Cards depend on each other, not just on themselves

A day-level orchestration pass runs after selection and before publish:

- Global CNS/volume budget shared across cards, so a peak-week lift day automatically reduces speed and conditioning volume rather than stacking.
- Cross-card conflicts resolved deterministically (heavy posterior-chain lift + max-velocity sprint on the same day, throwing volume vs. arm care dosage, game day pushing skill work to the front of the day).
- Each card's "why today" cites the sibling cards that shaped it, so the day reads as one session, not eleven independent ones.

## 4. Daily tests and test history become inputs and outputs

- Inputs: `athlete_daily_log` (sleep, soreness, CNS), `daily_standard_checks`, readiness/HPI, and logged test results feed the day's dosage and the decision to advance, hold, or deload.
- Outputs: each card declares which metric it moves and, when it is a test day, writes the result into the personal-best ledger so tomorrow's card reads it.
- Test cadence per domain is scheduled by the block wave (re-test on deload weeks), so history is continuous rather than incidental.

## 5. Career roadmap horizon

Above the 4-week block, add a long-horizon layer derived from age, training age, competition level and season phase:

- Career stage (development → build → performance → sustain → longevity/retirement transition), the multi-year emphasis for that stage, and this quarter's target inside it.
- Each card shows one line tying today to the stage: what today builds toward this season, and where this season sits in the athlete's arc.

## 6. UI

`WkProgressionNote` becomes the shared component every modality card renders: session title, block/week, "builds on", target vs. personal best, "what's next", and the career-stage line. Baseline sessions say "this sets your reference" instead of fabricating a target.

## 7. Guards

- Validator rejects publish when any card breaks its shape floor, repeats inside a re-exposure window without a progression flag, or ships without progression lineage.
- Extend the existing 60-day audit script to simulate all cards across several archetypes over 365 days, asserting block waves advance, deloads and re-tests land, cross-card budgets hold, and no card stagnates.

## Technical notes

- Files: `supabase/functions/_shared/wic/progression/progressionState.ts` (per-domain state + career horizon), each file in `_shared/wic/engines/` plus the `lift`, `conditioning`, `recovery`, `armCare`, `crossSport` modules, a new day-level orchestration pass in `wk-generate-daily/index.ts`, `_shared/wic/validator.ts`, `cardRegistry.ts`, and the `Wk*Card` components plus `WkProgressionNote.tsx`.
- No schema change needed: everything derives from `wk_prescriptions`, `wk_session_logs`, `athlete_daily_log`, and profile/context tables. If per-request derivation gets heavy, a cached progression row can be added later behind the same interface.
- Determinism preserved — selection stays pure and seeded, no AI call added to daily generation.
- Interpretive only: safety, recovery and medical layers still outrank the progression layer.
