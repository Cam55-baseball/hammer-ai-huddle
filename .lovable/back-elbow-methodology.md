# Back Elbow — Methodology Review Memo

Status: **methodology under review. No implementation.**
Owner: user (methodology) + Lovable (documentation).
Gate: cannot be implemented until determinism investigation closes AND the open questions below are answered.

## Verdict on the current metric

The existing `back_elbow_contact` tile measures elbow angle past the belly button **at the contact frame**. This is the wrong frame.

> At true contact, the barrel has typically already surpassed the back elbow if the hitter has stayed connected and delivered the barrel correctly. The goal is not "elbow at contact." The goal is the hitter's MOVE into the baseball.

The metric is currently scoring the consequence of the move, sampled after the move has already finished, on a frame where the elbow-to-barrel relationship has flipped. It is being deprecated as an actionable score and will be replaced.

In the meantime the tile has been relabeled "Back Elbow at Contact (under review)" with athlete-visible text telling hitters not to change mechanics based on it. The compute function is unchanged for replay-determinism reasons — only presentation is altered.

## Canonical methodology (locked in this memo)

### Frame window — NOT a single frame
Evaluation window = **launch (P4) → barrel delivery → contact**, plus **how long that window lasted** (i.e., a duration signal, not just a pose check).

### What is actually being evaluated
Source: user-authored, captured verbatim.

- The elbow makes it easier to slot the bat, but slotting the bat is more about getting the **hands on plane with the ball while the knob stays to the catcher**.
- During that, **if the elbow goes forward the barrel will begin to turn forward** without the hands losing position or compromising relative to the body.
- After the turn to contact, the hitter can allow the body to use the energy from **hips → shoulder → knob** to power through the ball, because they kept everything in a powerful kinematic position.
- **Connection (elbow-to-torso tightness)** must hold through launch.
- **Sequencing into the barrel** must be intact (elbow leads, barrel follows).
- **Shoulders stay as square as possible as long as possible**, while the back hip works aggressively — a primary cue.
- **Blind-spot minimization** is central. Cue: *"Blind spot starts when extension starts. Ideally you want to make contact then release the bat / go into extension. The time between where extension starts and contact is made is the blind spot. We want to minimize that, which is also the big idea behind the hitter's move. The elbow gets the barrel to contact."*

### Placement
**Standalone metric, renamed.** Working title: **"Connection & Barrel Delivery (P4 → Contact)"**. Final name TBD with user. Not merged into Sequencing, not merged into Hitter's Move, not retired.

## What this metric IS NOT
- Not "elbow angle at the contact frame."
- Not "extension at contact." Extension after contact is the goal; extension before contact is the blind-spot leak we are penalizing.
- Not a connection check in isolation — connection alone without barrel delivery is incomplete; barrel delivery alone without connection is the leak being measured.

## Open questions (must be answered before implementation)
1. **Landmarks for "shoulders square"** — which pose landmarks (and which projection plane) approximate "chest stays square as long as possible"? How is "as long as possible" measured: degrees of rotation between heel plant and contact? Time in milliseconds before shoulders cross a threshold rotation?
2. **Blind-spot detection** — what pose-derived signal marks the **moment extension starts**? Wrist-to-elbow angle crossing a threshold? Hand path inflection? Bat-tip trajectory (which we cannot reliably extract today without bat detection)? Define the signal and its replay-determinism characteristics.
3. **Window duration scoring** — should the window-duration component be additive to the connection-quality component, multiplicative, or gating (a short blind-spot is a prerequisite, then connection is scored)?
4. **Frame-rate sensitivity** — the smallest blind-spot we can resolve is bounded by `1 / fps_true` (16.7 ms at 60 fps). What is the minimum fps for the metric to be scoreable? Below that, the tile must show `missing` with reason `insufficient_temporal_resolution`, not a fabricated score.
5. **Sample sufficiency** — minimum number of frames inside the launch→contact window required for a non-`missing` score.
6. **Relationship to existing tiles** — explicit overlap analysis with `sequencing`, `hitters_move`, and `shoulder_to_shoulder_hold`. Confirm this is additive evaluation, not double-counting.
7. **Final name.**

## Implementation gate
Implementation is blocked until:
1. The determinism investigation concludes with Verdict A (Phase 1 acceptance) or with the relevant non-determinism defects fixed.
2. All seven open questions above are answered in writing.
3. The user explicitly authorizes the metric replacement.

Until then, the current tile stays labeled as "under review" and no swing recommendations cite it as the cause of any miss.
