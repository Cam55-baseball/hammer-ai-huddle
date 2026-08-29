# Throw "carry" — documented future connection, not a standalone metric

## Decision

`carry` is **not** built as a standalone `carry_ft` distance metric, and no
`carry` row is seeded in `scale_reference`.

Carry is not a distance. Carry is the *observed consequence* of backspin acting
on a thrown ball: a 4-seam grip produces clean backspin, backspin produces a
Magnus force opposing gravity, and the ball holds its line instead of dying.
Two throws of identical velocity and identical release angle produce completely
different carry depending on spin rate and spin efficiency. Recording a raw
distance therefore measures the throw's *launch conditions plus wind plus
surface* far more than it measures the athlete's ability to make a ball carry.

## Where it will come from

Carry reuses the **pitching spin-tracking architecture** already designed for
pitch movement (4-seam grip backspin → Magnus effect → movement/carry). Once
throw-side spin tracking exists, carry becomes a derived read of:

- spin rate (rpm)
- spin efficiency / active spin (%)
- spin axis relative to the throw line

No separate measurement pipeline is required, and no second definition of
"carry" is introduced. This is the same reason pop time, home-to-first, and
beaten-runner all route through one interpolation: one concept, one source.

## Interim proxy — recommendation

**Recommendation: do not build an interim proxy. Keep this a documented future
connection.**

The candidate proxies were evaluated and each fails the honesty bar:

| Candidate proxy | Why it fails |
| --- | --- |
| `carry_ft` measured on a flat-ground long toss | Confounded by launch angle, wind, and surface bounce. Would rank a high-arc, low-spin throw above a flat, true-carrying one — the exact inversion of what carry means. |
| Velocity retained over distance (radar at release vs. at receipt) | Directionally real, but needs two synchronized radar reads that no current surface captures. Not buildable today. |
| Evaluator eye-test "carries / dies" tag | Subjective, unanchored, and would occupy the metric name that the real spin-derived measurement needs later. |

A proxy here would occupy the `carry` slot with a number the system cannot
defend, and would have to be retired the moment real spin tracking lands. The
correct state today is: carry is a known, named gap with a known source, and it
reports as missing rather than as a fabricated value.

## Status

- Blocked on: throw-side spin tracking (reuses pitching spin architecture).
- Not blocked on: any new schema, anchor, or scoring rubric.
