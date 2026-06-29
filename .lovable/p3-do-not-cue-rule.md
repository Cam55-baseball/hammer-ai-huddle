# P3 Do-Not-Cue Rule (enforceable)

**Status:** Additive enforcement layer over the hitting doctrine. Referenced
by `.lovable/hitting-philosophy-v2-arakawa-integration.md`, enforced by
`scripts/lint-no-p3-cue.ts` in CI.

**Rule:** P3 (stride / heel plant) is involuntary. It is never coached as a
conscious action. It emerges from organized P1 + P2 + P4.

## Banned athlete-facing cue phrases

These strings are forbidden in athlete-facing cue surfaces (`src/components/**`,
`src/lib/hammer/**` cue outputs, `src/data/**` seed copy, `src/i18n/**`
athlete-facing locale strings). They are permitted only in:

- this file (the rule itself)
- `.lovable/hitting-philosophy-v2-arakawa-integration.md` (the doctrine)
- `coach_note` fields (coach-facing diagnostic voice, never athlete voice)
- historical `.lovable/back-elbow-methodology.md`, `.lovable/p3-timing-methodology.md`
  (prior doctrine preserved verbatim under additive law)

| Banned phrase                                | Reason                                  | Approved replacement |
|----------------------------------------------|-----------------------------------------|----------------------|
| "stride to the pitcher"                      | Cues conscious P3                       | Drop. Re-cue P4 elbow drive. |
| "step to the pitcher"                        | Cues conscious P3                       | Drop. Re-cue P4 elbow drive. |
| "push the back hip"                          | Cues conscious P3 via projection        | "Back elbow leads — hands stay back." |
| "push back hip through the ball"             | Conscious back-hip projection forbidden | "Back elbow rushes past the front hip." |
| "project the back hip through the ball"      | Conscious back-hip projection forbidden | "Back elbow rushes past the front hip." |
| "project the back hip through release"       | Conscious back-hip projection forbidden | "Chest to the plate; elbow past the front hip." |
| "drive the back hip to the release point"    | Conscious back-hip projection forbidden | "Knob stays back; elbow drives to the inner half." |
| "drive the back hip through the ball"        | Conscious back-hip projection forbidden | "Knob stays back; elbow drives to the inner half." |
| "consciously stride"                         | Explicit violation                      | Drop entirely. |
| "think about your stride"                    | Explicit violation                      | "Don't think about striding — the body will plant when it needs to." |

## Permitted phrases (clarification — these are NOT banned)

- "Back hip controls the step" — describes the *involuntary* landing, used in
  coach-voice `coach_note` only.
- "Load the back hip" — this is the P1 cue, not a P3 cue. Permitted everywhere.
- "Back hip load" — P1 cue. Permitted.
- "Land sideways" — describes the *outcome* of correct organization, permitted
  in coach voice; in athlete voice, prefer the canonical cue ("the body will
  plant when it needs to").

## How to fix a poor P3 (without cueing P3)

1. Re-grade P1: was the hip load complete before the pitcher's hands broke?
2. Re-grade P2: did the hands stay back? Did the knob hold depth?
3. Re-grade P4: did the back elbow lead the rush past the front hip? Did the
   chest stay to the plate? Did the hips → shoulders → hands sequence fire?

If P1/P2/P4 are clean, P3 self-corrects. If P3 still fails, the upstream cue
or constraint is wrong — not the stride instruction.
