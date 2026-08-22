# Elite Training Methods Engine v1

The third layer of every prescription:

1. **Which movement** — engines + catalog
2. **How much** — Zero-Drift Dosage Doctrine (`resolveDose`)
3. **How it is organized** — this engine

## Constitutional bounds

- A method **never authors a dose**. It may shift sets by at most ±1 and never
  outside the quarter envelope. Reps are never touched.
- A method **never widens eligibility**. Station movements are drawn from the
  same legality-gated pool the engines already filtered (season legality,
  injury contraindications, training age, scope, catalog integrity).
- A method **never blocks publication**. Every fatal method issue drops the
  method and ships the plain, already-certified block as a warning.
- Selection is **deterministic** — same context, same seed, same method.

## Families and library

| Family | Methods |
| --- | --- |
| Contrast | French Contrast, Contrast Pair, Complex Pair, PAP Primer |
| Intensity | Cluster Sets, Wave Loading, Bands / Chains, Tempo / Eccentric, Isometric Holds |
| Density | EMOM, Escalating Density, Tri-Set |

### French Contrast

Four stations, 20s between stations, full reset between rounds:

1. Heavy strength (anchor) — 3 reps
2. Plyometric — 5 reps
3. Loaded explosive — 3 reps
4. Assisted / overspeed — 5 reps

Home quarter is **OS Q3** (max 2×/week, 4 rounds). Legal but rarer in Q2 and Q4
(1×/week, 3 rounds). Illegal in Q1, in-season and post-season.

## Placement by quarter

```text
Q1  density + tempo + tri-sets        (build the base, never contrast)
Q2  complex / contrast pairs, clusters, first French contrast exposure
Q3  FRENCH CONTRAST home quarter, bands/chains, contrast pairs
Q4  contrast pairs, wave loading, PAP primers
IN  PAP primers, contrast pair (1×), EMOM, tri-sets, isometrics
POST tempo, EMOM, escalating density, tri-sets
```

## Vetoes (a method is never forced)

`method_veto_day_type` (game / tournament / travel / recovery / rest / RTP /
heavy practice), `method_veto_cns_clamped`, `method_veto_readiness` (any active
volume reduction), `method_veto_low_readiness` (self-reported CNS < 6),
`method_veto_injury`, `method_none_eligible`, `method_station_unresolved`,
`method_cns_headroom_exceeded`.

## Athlete gating

| Gate | Rule |
| --- | --- |
| Training age | Per method — beginner (tempo, EMOM, tri-set) → advanced (French contrast, isometrics) |
| Chronological age | 13 / 14 / 15 / 16 by method |
| Strength floor | French contrast requires at least one cleared weight-room standard award |
| Equipment | Bands/chains requires banded equipment; everything else is equipment-free |
| Frequency | Rolling 7-day ceiling per method, read from prior `why_payload.training_method_id` |

## Validator codes

Fatal (method dropped, plain block ships): `method_dose_outside_envelope`,
`method_rounds_underflow`, `method_station_incomplete`,
`method_station_order_broken`, `method_rationale_incomplete`.

Warn: `method_rounds_capped`, `method_cns_headroom_exceeded`,
`method_phase_illegal`.

## Persistence

- Per row: `why_payload.training_method` (structure, stations, rest, cue,
  bailout, why) and `why_payload.training_method_id` (frequency ledger).
- Per run: `wk_generation_diagnostics.training_methods` — applied methods and
  every veto code, replay-visible.

## Athlete surface

`MethodPanel` renders numbered stations with the resolved movement, reps, rest
label, the reason the method is prescribed, the single make-or-break cue, and
the bailout — so no athlete is ever left guessing mid-session.

## E2E governance audit

`deno run -A scripts/audits/methods-governance-audit.ts` — 15,812 assertions across:

- **A** catalog integrity (bounds, gating, rationale, station specs)
- **B** French contrast placement law (Q3 home, illegal Q1/in-season/post-season, advanced + 16+ + strength floor)
- **C** veto law (game/tournament/travel/recovery/rest/deload/return-to-play, CNS clamp, reductions, low readiness, injury, age/training-age/strength/equipment gates)
- **D** determinism (50 repeats per phase × engine)
- **E** dose containment (every method × phase × dose group × set count stays inside the envelope, reps never move, CNS headroom respected, incomplete stations drop rather than half-ship)
- **F** rolling weekly ceilings and the prior-payload usage ledger
- **G** forbidden-engine scope and bare-block protection
- **H** station resolution (same family, no repeats inside a round, deterministic, refuses to half-fill)

The audit must exit 0 before any change to `_shared/wic/methods/*` ships.

## Station classification precedence

A loaded jump ("trap bar jump", "jump squat") reads as plyometric by name but is really the
loaded-explosive station. Precedence is **assisted > loaded-explosive > plyometric**, so station 3
is never starved by a naming collision. Catalog coverage for all four stations is seeded across
lower, upper push, upper pull and rotation families — if a family ever falls short, the method
degrades to a simpler one rather than inventing work.
