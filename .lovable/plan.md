
# Bucket A Presentation Pass + Methodology Memos

Scope is presentation-layer wording, labeling, and read-only methodology documentation. **No measurement formulas change. No metric engine changes. No schema, prompt, or edge-function logic changes.** The determinism investigation continues exactly as previously approved.

## 1. Bucket A — presentation/wording fixes (code edits, copy only)

For each item I will first locate the exact component/string with read-only search, then edit only the user-visible copy. No scoring math touched.

1. **P2 knee-lift wording** — correct the report-card description so it matches the actual P2 definition.
2. **Sequencing explanation** — rewrite the athlete-facing explanation to describe hip → shoulder → elbow → hand → barrel chain in plain language; clarify what a low score means.
3. **Finish & balance wording** — replace "hold a two-hand finish" with: *"Stayed connected with two hands through contact and extension until the ball was gone."* Wording only; the measurable definition stays unchanged pending separate review (see §3).
4. **Hands-outside-shoulders drill explanation** — rewrite the drill rationale so it explains the connection failure being addressed, not a generic "keep hands in" cue.
5. **Thumbnail-failed message** — replace the current message with an honest, non-blaming line that says what failed and what the user can do.
6. **Honest failed-analysis surfaces** — when an analysis run finishes with `outcome != ok`, the result card surfaces the real reason (probe failed / frames dropped / model error) instead of showing a fabricated score or a misleading "complete" state.
7. **Confidence % investigation + labeling** — read-only trace of where the `confidence_summary_jsonb` number on the report card comes from, what it actually represents, and a label change so the UI tells the truth (e.g. "Frame-coverage confidence" vs "Model confidence"). If the source is ambiguous, the label becomes `Confidence (provisional)` and the finding is logged for the determinism evidence package — no number is invented.
8. **Related presentation clarifications** discovered while doing the above are limited to copy and labels; anything that would change a formula is logged, not edited.

Deliverable: a short `.lovable/bucket-a-changes.md` listing every file touched and the before/after string, so the change set is auditable.

## 2. Back-elbow methodology memo (no implementation)

Capture your direction as the canonical methodology record for future implementation review. Written to `.lovable/back-elbow-methodology.md`. Key points locked in from your answers:

- **Not a single-frame metric.** Evaluation window = **P4 launch → barrel-delivery → contact**, plus how long that window lasted.
- **Renamed standalone metric.** Working name: **"Connection & Barrel Delivery (P4 → Contact)"**. Final name TBD with you.
- **What it actually evaluates:**
  - Back elbow stays connected to torso through launch.
  - Shoulders stay as square as possible as long as possible while the back hip works aggressively.
  - Elbow works forward → barrel begins to turn forward → hands stay in a powerful kinematic position with knob to the catcher → hips→shoulder→knob power through the ball.
  - **Blind-spot minimization:** time between *extension starts* and *contact made* should be as short as possible. Ideal sequence = contact, then release/extension.
- **Explicitly not:** "elbow position at the contact frame." Current metric is measuring the wrong frame and will be deprecated once the replacement is approved.
- **Open questions logged for next review round** (not answered now): which landmarks/derived signals approximate "shoulders square," how blind-spot duration is detected from pose data, frame-rate sensitivity, and minimum sample needed to score the window.

No code changes. No metric engine changes. Memo is the deliverable.

## 3. Bat Path vs On-Plane % — definitions doc (evidence first)

Read-only investigation written to `.lovable/bat-path-vs-on-plane-definitions.md`:

- Current definition of each metric as it appears in code and in the report card.
- Exact code references (file + symbol) for the computation path of each.
- The input frames each uses.
- Whether the prompt to the model treats them as the same or different.
- A side-by-side comparison table.
- A verdict candidate (A same-metric-different-names / B distinct / C retire one) **supported by the evidence**, presented for your decision. No redesign, no edits.

## 4. Finish & Balance — methodology note

Short addendum in `.lovable/finish-and-balance-methodology.md` capturing: the true intent ("connection with two hands through contact and extension until the ball is gone"), why the current measurable definition may not match, and a flag that the measurable definition requires a separate review before any change. Wording fix in §1.3 is the only code change.

## 5. Time-to-Contact vs Bat Speed / Power — methodology note

Documented in `.lovable/time-to-contact-vs-power.md`:

- Time to Contact = quickness, efficiency, more time to see the ball, adjustability, strong separator of high-level hitters.
- Bat Speed = power production, damage potential.
- Elite hitter = both, and they compound.
- Future metric work treats them as separate baseball qualities, not substitutes, unless evidence proves otherwise.

No measurement changes now. Future Phase 2 work must reference this note.

## 6. Determinism investigation

Continues exactly as previously approved. **No Phase 2 metric implementation is authorized** until that investigation completes and you review it. Bucket A is presentation-only and does not gate or block the investigation.

## Out of scope (explicitly)

- No metric formula edits.
- No engine-version or prompt-version bumps.
- No schema migrations.
- No new edge functions.
- No MediaPipe work.
- No Phase 1.5 or Phase 2 work.
- No design refresh; copy and labels only.

## Deliverables summary

Code (copy/labels only):
- Bucket A wording fixes in the existing report-card / drill / analysis-status components.

Docs (read-only methodology + audit):
- `.lovable/bucket-a-changes.md`
- `.lovable/back-elbow-methodology.md`
- `.lovable/bat-path-vs-on-plane-definitions.md`
- `.lovable/finish-and-balance-methodology.md`
- `.lovable/time-to-contact-vs-power.md`
