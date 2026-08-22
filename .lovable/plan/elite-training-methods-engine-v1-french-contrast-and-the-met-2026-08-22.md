# Elite Training Methods Engine v1 — French Contrast and the Method Library

Today the app decides *which* movements an athlete does and *how much* (sets/reps) — but it never decides *how* the work is organized. Elite programs live in that third layer: contrast pairs, cluster sets, wave loading, tempo work, density blocks. This adds that layer as one governed engine, with French contrast as its flagship method, applied only where it is safe and earns its place.

## What the athlete sees

- A lift, speed, or bat-speed block can be stamped with a **method** — e.g. "French Contrast — 4 stations, 1 round every 3 min".
- The method renders as an ordered, numbered mini-sequence inside the card (station 1 heavy, 2 plyo, 3 loaded jump, 4 assisted/overspeed), with rest between stations spelled out. No guesswork.
- Every method carries a plain-language **"Why this method today"** line: what it trains, why it fits this quarter, and what to do if it feels wrong.
- If the athlete isn't eligible (age, training age, readiness, game day, in-season load), they never see the method — they see the normal block. No teasing, no locked badges.
- Logging is unchanged in feel: each station logs like a normal exercise, with per-station targets.

## Method library

Four families, each with quarter and eligibility rules:

**Contrast / complex**
- French contrast (4 stations: heavy strength → plyometric → loaded explosive → assisted/overspeed)
- Contrast pair (heavy → matched plyo)
- Complex pair (strength → same-pattern power)
- Post-activation potentiation primer (single heavy set → expression)

**Intensity**
- Cluster sets (intra-set rest, quality preservation)
- Wave loading (ascending/descending intensity waves)
- Accommodating resistance (bands/chains, equipment-gated)
- Tempo / eccentric emphasis
- Overcoming and yielding isometrics

**Density / capacity**
- EMOM
- Escalating density block
- Tri-set / giant set for accessory clusters
- Capacity finisher

## Where methods apply

- **Lifts** — full method library.
- **Speed** — contrast family only (resisted → free sprint, hill/sled contrast, assisted overspeed for eligible athletes).
- **Bat speed** — the existing prime → potentiate → contrast → intent → transfer stages are re-expressed as method-engine methods so there is exactly one contrast doctrine in the app.
- **Power / plyo blocks** — contrast and density.
- **Arm care, recovery, mobility, return-to-play** — methods are structurally forbidden. Never method-stamped.

## Strategic placement (no method for method's sake)

French contrast is the sharpest tool in the box and is treated that way:

- **Q1 (Strength & Capacity)** — no French contrast. Cluster sets, tempo/eccentric, density accessories only. The athlete is building the strength floor the method requires.
- **Q2 (Power Build)** — contrast pairs and complex pairs. French contrast unlocked for advanced/elite only, at most once per week.
- **Q3 (Elastic Transfer)** — French contrast's home quarter. Up to twice per week for eligible athletes, on high-readiness training days.
- **Q4 (Sport Sharpen)** — French contrast at reduced volume (fewer rounds), plus PAP primers and wave loading.
- **In-season** — PAP primers and low-volume contrast pairs only, never on game day, never the day before a start for pitchers. No French contrast.
- **Post-season** — decompression only. No contrast family.

Additional hard placement rules: never on a game day, tournament day, travel day, heavy-practice day, recovery day, or return-to-play day; never when readiness/CNS fatigue is flagged; never twice in the same 72 hours; never stacked on top of an already CNS-heavy day.

## Eligibility, tiered by method

| Method tier | Requires |
|---|---|
| Density / capacity, tempo | Any training age, 13+ |
| Cluster sets, complex pairs, PAP primer | Developing+, 14+ |
| Contrast pairs, accommodating resistance, wave loading | Intermediate+, 15+ |
| French contrast, assisted overspeed, heavy isometrics | Advanced/elite, 16+, plus a demonstrated strength floor |

The strength floor reuses the existing weight-room standards evaluator: the athlete must have cleared the relevant relative-strength mark before French contrast becomes legal for them. Standards keep zero dose authority — they act purely as a safety gate here.

## Dose authority

Methods are a **bounded modifier inside the dosage doctrine**, not a competing source of numbers.

- `resolveDose` remains the only producer of sets and reps.
- A method may then apply a declared, versioned transform within a fixed clamp: reshape sets into rounds/stations, add intra-set rest, add per-station rep counts, and adjust total volume by at most one set in either direction — never outside the quarter's envelope floor and ceiling.
- Total CNS cost of a method-stamped block must stay inside the template's existing CNS share. If it doesn't, the method is dropped and the plain block ships.
- Everything is version-stamped and replay-deterministic; the same inputs always produce the same method and the same numbers.

## Guardrails so nobody second-guesses us

- Method selection is deterministic, never random.
- If any check fails — eligibility, quarter, readiness, equipment, CNS budget, station resolution — the method silently drops and the standard block publishes. A method never blocks a workout from being generated.
- Every station must resolve to a real catalog movement with a full substitution ladder; a half-resolved contrast complex is illegal.
- New validator fatals: `method_illegal_phase`, `method_illegal_training_age`, `method_illegal_day_type`, `method_unresolved_station`, `method_cns_overflow`, `method_frequency_exceeded`, `method_forbidden_engine`. Warn: `method_equipment_substituted`.
- Every method-stamped block gets a complete `why_v2` (`why_method`, `why_station`, `why_rest`) alongside the existing fields.

## Technical notes

New shared module `supabase/functions/_shared/wic/methods/`:
- `catalog.ts` — `MethodDef` (id, family, stations, rest rules, CNS multiplier, quarter legality, training-age/age floors, engine allow-list, equipment needs, standards prerequisite).
- `eligibility.ts` — pure predicate over training context, athlete context, readiness, day type, weekly method ledger.
- `selector.ts` — deterministic single-method resolution per block, seeded from the existing determinism seed.
- `apply.ts` — takes the doctrine dose plus the method and emits station rows within clamps; refuses and returns null on any overflow.
- `validate.ts` — the fatal/warn codes above, wired into `globalValidatorRegistry.ts`.

Integration points:
- `lift/sessionBuilder.ts` — certify the method after lift rows are built, before publication.
- `engines/speed.ts` and `engines/batSpeed.ts` — route their existing contrast/PAP concepts through the method engine (bat speed's stage model becomes a thin adapter, keeping current behaviour when no method is selected).
- `dosage/doctrine.ts` — add `applyMethodModifier` with hard clamps; no changes to `DOSE_MATRIX`.
- Weekly method frequency tracked through the existing `balance/weeklyLedger.ts`.
- Diagnostics on `wk_generation_diagnostics`: `method_id`, `method_family`, `method_station_count`, `method_eligibility_result`, `method_governance_version = "methods_v1"`.

Client:
- Mirror `catalog.ts` under `src/lib/hammer/methods/` for display labels and cues.
- `WkLiftsCard.tsx`, the speed and bat-speed cards: render a method header, numbered stations, rest timers, and the "Why this method today" disclosure.
- `ExerciseLogSheet.tsx` / `RoundGrid.tsx`: station-aware logging, one target line per station; unilateral and per-side logging behaviour unchanged.

Docs and tests:
- `docs/wic/training-methods-v1.md` — doctrine, placement matrix, eligibility table, dose-clamp rules.
- `scripts/audits/method-governance-audit.ts` — asserts no method appears on illegal quarters/day types, no CNS overflow, no unresolved stations, and frequency caps hold across a simulated season.
- Replay determinism test extended to cover method selection.
