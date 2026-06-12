
# Hitting Report Card — Copy Refinement, 2 New Tiles, Accuracy Pass, and Video Suggestions Surfacing

All work is scoped to `src/lib/reportCard/disciplines/bh.ts`, the shared server contract for new keys, and a small owner-visible doc for where Hammer Picks render. No schema changes, no UI framework changes.

## 1. Copy fixes on existing BH tiles (`bh.ts` explainer text only)

- **Hip Load Stability — howToImprove:** Replace the misplaced "catch-play with intent" line. New copy focuses on hitter-specific stability: mirror a partner's leg lift and hold peak load with zero front-foot, head, or body drift; tee work with eyes closed at peak load to feel a quiet centerline; weighted-bat hip-load holds.
- **Eyes / Head Tracking — howToImprove:** Add that a loaded scap AFTER P1 is what locks the head still (scap pulls the chin/eye line into a fixed post). Add the pro "ball-on-the-load-spot" drill: place a ball where the head sits at peak load, take the swing, then check that the head has returned to that same reference point relative to the ball.
- **Heel Plant / Landing — whatWhy clarification:** State that "heel plant" = full foot down (not just the heel); the back hip is what controls the stride (pitcher-like stride that tensions the core); if the scap stays loaded pre-stride the stride naturally stays sideways as long as shoulders don't open — meaning the athlete can go full force without leaking.
- **Sequencing — whatWhy addition:** Add that the back hip is what drives the front foot to the ground — the step / back hip should be completely maxed out involuntarily by landing, with all voluntary hip work spent during the stepping phase.
- **On-Plane % — howToImprove rewrite:** Line the hands up with the ball to "catch" it — knob does NOT compromise forward ahead of the elbow. The elbow is responsible for the forward turn to the ball. Drills: knob-stays-back tee work, elbow-leads constraint, catch-with-both-hands cue at the contact point.
- **Time to Contact — howToImprove rewrite:** No upper-body movement until the hips have cleared a path of least resistance; THEN the back elbow goes forward linearly, taking the barrel to contact while the knob stays back as a fulcrum. Drills: pause-at-launch tee, hip-clear-first dry cuts, knob-pinned-to-side reps.
- **Back Elbow at Contact — whatWhy + howToImprove addition:** Knob must stay back / pinned for the elbow-to-ball move to work. Cue users to "hunt the ball with the back elbow while the knob stays in the loaded position." Drill: knob-anchored tee reps, elbow-to-ball with a partner holding the knob.
- **Hitter's Move Quality — howToImprove rewrite:** Tighten to: knob stays back (fulcrum) → hips clear → back elbow leads linearly → hands stay in line with the ball → barrel last. Drills aligned to that order.
- **Finish & Balance — whatWhy rewrite:** Reframe as proof-of-rotation and proof-of-sequence — a clean two-hand, balanced finish over a stacked back leg means the rotation finished its job, the knob stayed back long enough, and the athlete is already reset for the next pitch; falling off line is evidence of a linear leak earlier in P4.

## 2. Two new tiles (added to P4 group in `bh.ts`)

### A. Shoulder Plane Steadiness (P4) — score_meter + implicit pass/fail
- key: `shoulder_plane_steadiness`
- mode: `score_meter` (0–100). The status itself functions as PASS/FAIL/elite, satisfying the "x/100 & Pass/Fail" requirement within one tile (consistent with existing meter doctrine).
- standard: "Once shoulders begin to rotate in P4, the shoulder plane holds steady through contact"
- thresholdChip: "Acceptable 70 · Elite 90"
- explainer: rotating shoulders must hold the plane they started on; a steady plane = the largest possible contact window for what the eyes already saw.
- contract key: `shoulder_plane_steadiness_score_100` (with legacy `_score_10` fallback rule reserved if needed).

### B. Hands Outside Shoulders at Landing (pre-P4) — pass_fail
- key: `hands_outside_shoulders_at_landing`
- mode: `pass_fail`
- phase: "P3 Stride / Landing" (since it's measured AT landing, before P4 begins)
- standard: "At front-foot strike, hands sit OUTSIDE the shoulder line horizontally"
- explainer: hands outside the shoulder line at landing give the athlete the runway to get on plane AND stay on plane smoothly.
- contract key: `hands_outside_shoulders_at_landing_pass` (boolean).

Both new keys get mirrored in `supabase/functions/_shared/reportCardContracts.ts` with prompt copy + worked examples so the AI extracts them. No DB migrations.

## 3. Accuracy pass — Time to Contact & Bat Speed Through Contact

These are flagged as "bread and butter" so the server contract gets strengthened, not the UI:

- In `supabase/functions/_shared/reportCardContracts.ts`, expand the per-metric prompt for `time_to_contact_ms` and `bat_speed_contact_mph`:
  - **Frame anchors:** swing start = first frame where the knob begins forward motion AFTER hands have completed load and hips have begun to clear. Contact frame = first frame of bat-ball overlap.
  - **Calibration:** require full-body or full-bat visibility; require known fps (use video metadata); if fps cannot be confirmed → return `missing` with `missing_reason: "fps_unknown"`.
  - **Bat speed:** measure peak barrel translational speed over a 2-frame window straddling contact; convert to mph via known bat length (use 33 in default, note assumption). If barrel obscured at contact → `missing`.
  - **Never guess:** if either anchor frame is ambiguous → `missing` with reason.
- In `supabase/functions/analyze-video/index.ts` two-pass logic: if either of these two keys comes back missing, ALWAYS trigger the targeted second pass for them regardless of the >40% threshold.

No client logic changes for these two metrics beyond what's already shipped.

## 4. Owner visibility — where Hammer Picks render

No code change required to make picks render (already wired). Add a short owner-facing doc + a single dev-mode debug surface so the owner can confirm tagging is taking effect.

Picks already render in:
- **Post-session summary** (`src/components/practice/PostSessionVideoSuggestions.tsx` → `VideoSuggestionsPanel` with mode `"session"`) — appears immediately after a saved practice session whose drill blocks / outcomes / context resolve a skill domain.
- **Dashboard long-term picks** (`src/components/dashboard/LongTermVideoSuggestions.tsx`) — driven by the athlete's weakness profile.
- **Weakness cluster cards** (`src/components/hie/WeaknessClusterCard.tsx`).
- **Analyze Video** flow (`src/pages/AnalyzeVideo.tsx`) — post-analysis suggestions tied to detected issues.

Add a single doc page `docs/owner/video-suggestions-surfaces.md` enumerating:
- Each surface and what triggers it.
- The tag fields the owner controls (`skill_domains`, `video_tag_assignments`, `distribution_tier`) and how they map to selection.
- A "how to verify" checklist: tag a video → confirm it appears in the matching post-session surface for a test session whose patterns match its tags.

No new UI built — purely documentation so the owner has a single reference. (If the owner wants a live admin "preview suggestions for this tag set" tool, that's a separate scoped task.)

## Out of scope
- DB schema changes.
- Reworking the Hammer Picks recommendation engine itself.
- New scorecard formulas outside the report card.
- Softball-specific deltas.

## Files touched
- `src/lib/reportCard/disciplines/bh.ts` — copy edits + 2 new tiles.
- `supabase/functions/_shared/reportCardContracts.ts` — 2 new keys, strengthened TtC + BatSpeed prompts.
- `supabase/functions/analyze-video/index.ts` — force second-pass for TtC + BatSpeed when missing.
- `docs/owner/video-suggestions-surfaces.md` — new doc.
