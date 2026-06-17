# Finish & Balance — Methodology Note

Status: **methodology note. Wording-only change shipped (see `bucket-a-changes.md §5`). Measurable definition is NOT changed.**

## True intent (locked from user)

The goal is **NOT** "hold a two-hand finish."

The goal **IS**: **maintain connection with two hands through contact and extension until the ball is gone.**

The two-hand finish is the *visible byproduct* of connection holding through extension. It is not the metric goal in itself. Athletes who pose a two-hand finish without holding connection through extension would currently score well on this tile despite executing the wrong intent — and athletes who hold connection perfectly but release the bat naturally after extension may score poorly despite executing the intent correctly.

## Why the measurable definition may not match

The current `compute` reads `finish_balance_score_100`, a single model-authored number that the model derives from observation of the post-contact pose. This number is influenced by:
- Body balance after swing.
- Whether the model observes a two-hand finish pose.
- "No fall-off" inference from the model.

It is **not** explicitly a measurement of:
- Connection holding through contact.
- Connection holding through extension.
- Time-to-release relative to the ball clearing extension.

So the score may correlate with the true intent without measuring it. A different swing with identical body balance but earlier hand release would score the same.

## What changed in this pass (presentation only)

- `standard` text updated to: *"Stayed connected with two hands through contact and extension until the ball was gone."*
- `explainer.whatWhy` rewritten to state the connection-through-extension intent and that the two-hand finish is the byproduct, not the goal.
- Explicitly notes in athlete-visible copy that the **measurable definition is being reviewed separately**.

## Open questions for the separate review

1. Can the existing pose stream (no bat-detection) identify the moment of "ball gone past extension" with sufficient confidence to gate the score?
2. Should the metric become a **time-from-contact-to-hand-release** signal in milliseconds, rather than a 0–100 pose score?
3. How does this interact with `shoulder_to_shoulder_hold` (which is also a connection-holding metric, but earlier in the swing)?
4. Frame-rate sensitivity for "release moment" detection.

## Implementation gate

The measurable definition cannot change until:
1. Determinism investigation completes.
2. User authorizes a replacement formula.
3. Open questions above are answered in writing.
