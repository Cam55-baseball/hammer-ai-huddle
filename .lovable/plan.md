# Hitting Philosophy v2 — Arakawa Integration (Option B: Felt Sequence P1→P2→P4→P3-emerges)

## Confirmation (locked before build)

- **Purely additive.** All prior hitting work stays authoritative: `.lovable/back-elbow-methodology.md`, `.lovable/bat-path-vs-on-plane-definitions.md`, `.lovable/p3-timing-methodology.md`, `.lovable/finish-and-balance-methodology.md`, `.lovable/time-to-contact-vs-power.md`, the report-card era doctrine, all `hittingCausalChains` / `HittingDoctrineBlock` / `formulaPhases` content, and every existing cue.
- **Phase numbering stays P1→P2→P3→P4** for code, data, scoring, video tags, report cards, doctrine snapshots, causal chains, roadmaps, and the naked-eye visual sequence.
- **Meaning refinement (additive, no rename):**
  - P1 = Hip Load (NN) — unchanged
  - P2 = Hand Load (clarified — hands break / load is the conscious P2 cue; not stride)
  - P3 = Involuntary Stride / Heel Plant — **DO-NOT-CUE.** Emerges from P1+P2+P4 organization. No back-hip push, no projecting back hip through ball/release, no conscious stride.
  - P4 = Hitter's Move (NN, elite-eligible) — unchanged, now explicitly the athlete's third *felt* action.
- **Athlete felt sequence:** P1 → P2 → P4 → (P3 emerges). Coach/scorer/video timeline still reads P1→P2→P3→P4.

## The new canonical cue (Arakawa-integrated, additive)

"Knob stays back while the back elbow works forward to the inner half of the ball. Hands stay back to receive. Back elbow rushes past the front hip, chest sideways to home plate, hands still back — this creates hips lead, shoulders follow, hands last. Turn to the ball, hit *through* the ball, release through contact. Close the blind spot between contact and releasing the bat. Don't think about striding — the body will plant when it needs to."

## Files to add (new — pure additions)

1. `**.lovable/hitting-philosophy-v2-arakawa-integration.md**` — master doctrine doc. Sections:
  - Status: ADDITIVE OVERLAY. Lists every prior doc that remains in force.
  - Arakawa pillars (center-first, active waiting / Body of a Rock, organization over force, constraint-led).
  - The Felt-vs-Seen rule (naked eye P1-P2-P3-P4; hitter feels P1→P2→P4→P3-emerges).
  - P3 do-not-cue rule with explicit forbidden cues: "stride", "push back hip", "project back hip through the ball", "drive back hip to release point", "step to the pitcher".
  - Canonical cue (above), plus per-phase athlete cues and coach notes.
  - Back-elbow + knob-back + hands-stay-back mechanics paragraph (verbatim from user).
  - Sequencing law:Elbow- hips → shoulders → hands; turn to ball / hit through ball / release-through-contact; close the blind spot.
2. `**.lovable/p3-do-not-cue-rule.md**` — short enforceable rule sheet listing banned cues and approved replacements, referenced by linter + cue libraries.

## Files to update (additive edits — no deletions of prior content)

3. `**src/lib/hittingCausalChains.ts**` — append Arakawa-integrated `athlete` / `coach_note` strings to the P2 and P4 chain links; rewrite the P3 chain links to surface "involuntary — do not cue" while preserving the existing diagnostic copy as `coach_note` history. Keep phase ids, keys, ordering identical.
4. `**src/lib/hittingPhases.ts**` + `**src/lib/formulaPhases.ts**` — update P2 label to "P2 Hand Load" (was Heel Plant), add `feltOrder` (1,2,4,3) field alongside existing `step` (1,2,3,4); P3 gets `doNotCue: true` and an `involuntary: true` flag. Existing `p2_heel_plant` / `p3_launch` ids preserved as aliases so no DB / video-tag migration is needed.
5. `**src/components/hitting/HittingRoadmapLadder.tsx**` + `**src/components/hitting/HittingDoctrineBlock.tsx**` — render an athlete-facing "Felt order" badge (1 → 2 → 4 → 3*) next to the existing numeric ladder, with a tooltip explaining P3 is involuntary. Naked-eye timeline rendering unchanged.
6. **Cue libraries / Hammer cue surfaces** that emit hitting cues (search for `back hip`, `stride`, `push hip`, `drive back hip` across `src/lib/hammer/**`, `src/data/**`, `src/lib/hitting*`, `src/components/hitting/**`) — replace banned phrasings with the approved Arakawa cue set. Each replacement is a code change *plus* a record in `p3-do-not-cue-rule.md`.
7. `**scripts/lint-no-p3-cue.ts**` (new, modeled on `scripts/lint-no-landmark-recency.ts`) — fails CI if banned P3 cue strings appear in `src/**`, `.lovable/**` (except the rule doc itself), or seed data.
8. **Report-card / doctrine snapshot writers** (`hie_snapshots.hitting_doctrine` producers) — bump `engine_version` to `hitting-doctrine-v2-arakawa`, include new `felt_order` + `do_not_cue_phases: ['P3']` fields. Replay-safe: prior snapshots remain valid under their pinned engine_version.

## Technical notes

- No DB migration required: phase ids stay stable; new fields are additive on JSON snapshot columns and TS types.
- Constitutional compliance: additive-only, replay-safe at pinned `engine_version`, lineage preserved, no organism-truth rewrite. Subordinate to Megaphase 111–150 translation governance — old cues compressed/superseded in surfaces but preserved in `coach_note` history.
- Scope: frontend + doctrine docs + one CI lint script + snapshot writer version bump. No backend schema changes.

## Out of scope (explicit)

- Renaming phases in DB, video tags, or scoring caps.
- Removing any prior philosophy doc or cue library entry (only superseding via additive `coach_note` history + lint).
- New UI surfaces beyond the Felt-order badge on existing doctrine renderers.