# Presentation Finalization Pass — Phases 152–154

Substrate is frozen. This pass turns the verified relational organism into a 10–12 minute investor-grade demo. No new primitives, no new doctrine, no new megaphases. All work stays in seeding, copy, layout, pacing, and resilience.

## Section 1 — Live Demo Athlete Hydration

Run `scripts/seed-relational-demo.ts` against the live DB for canonical athlete `demo-athlete-001` via the verified pipeline.

- All writes go through `src/lib/runtime/relational/emit.ts` wrappers — no direct `asb_events` inserts, no bypass paths.
- `visibility_scope: "demo"` on every emitted event.
- Deterministic `event_id = sha256(athlete_id, topic, offset)` ensures idempotent re-runs; existing rows are skipped, not duplicated.
- Add a `--live` flag to the existing seed script (currently test-fixture only) that:
  1. Confirms DB target via `VITE_SUPABASE_PROJECT_ID` echo + prompt
  2. Walks the deterministic offset table emitting through `emit.ts`
  3. Writes `asb_event_lineage` edges alongside each event
  4. Prints a per-topic count summary

Longitudinal cadence (deterministic clock = `2026-01-01T00:00:00Z` + offsets in days):
- d0–d30: `youth_intro` developmental baseline, parent relationship established, coach relationship established, first 3 Hammer turns
- d45–d90: `developmental_foundation` gate, growth spurt detected → automatic deload prescription, parent trust accrual
- d100–d140: confidence dip / slump narrative event, Hammer reload conversation citing earlier turns (RR-1)
- d150–d200: recovery progression, psych self-report supremacy demonstrated, bounded inferred state ≤ 0.7
- d210–d280: `competitive_entry` gate, recruiter contact (gated as minor → parent supremacy), exposure event
- d290–d330: continued coach continuity, narrative markers, journey arc closure

## Section 2 — Narrative Coherence Pass

Audit each `/relational` surface for one-human continuity. Component-level edits only — no projection changes.

- `HammerConversationPanel`: unify voice (calm, observant, accountable, non-hype). Remove any seeded line containing hype/clichés.
- `DevelopmentalStageChip`, `AthleteJourneyMap`: ensure stage labels and journey beats reference the same vocabulary.
- `SlumpReloadFlow`: emotional arc must reference cited Hammer turns by date, not abstract IDs.
- `ParentTrustCard`, `RecruitingRoadmap`, `InjuryLifecycleStrip`: terminology pass for consistency (e.g. one term for "deload" everywhere).
- Build a single `src/lib/relational/copy.ts` tone dictionary so all surfaces draw from one voice source.

## Section 3 — UX Simplification Pass

Athlete-facing surfaces strip internal terminology.

- Remove visible mentions of: `visibility_scope`, `engine_version`, `reasoning_version`, `lineage`, `replay`, `confidence ceiling`, `RR-1/2/3`, `ASB`, `projection`.
- Move all such labels behind a single "Replay proof" panel (Section 4 last beat) only.
- Tighten typography hierarchy on mobile (440px viewport is the demo target): one H1 per screen, generous spacing, max 2 emphasis weights.
- Hide debug chips by default; expose via `?debug=1` query param for engineering review only.

## Section 4 — Demo Choreography (10–12 min target)

Add `src/pages/RelationalDemo.tsx` — a guided sequencer that drives the same components in a fixed click-path with subtle Motion transitions. Existing `/relational` page remains the free-explore surface.

Sequence (≈11 min):
```text
1. Start Here / Today                       0:00 – 0:45  emotional anchor
2. Athlete Journey Map (overview)           0:45 – 2:00  longitudinal feel
3. Developmental Stage Chip + growth spurt  2:00 – 3:30  developmental intelligence
4. Slump Reload Flow (cited memories)       3:30 – 5:30  emotional peak
5. Hammer Conversation Panel                5:30 – 7:30  relational continuity
6. Parent Trust Card                        7:30 – 9:00  safety perception
7. Recruiting Roadmap (minor gating)        9:00 – 10:00 protective override
8. Injury Lifecycle Strip                  10:00 – 10:30 read-only continuity
9. Replay Proof Panel (technical close)    10:30 – 11:30 credibility reinforcement
```

Emotional peaks (Slump Reload, Parent Trust) precede the technical replay proof.

## Section 5 — Hammer Conversation Refinement

Rewrite seeded `coach_hammer` turns in `_seed.ts` → live seed:
- Every turn cites ≥1 `recalled_event_ids` (RR-1 enforced at schema; this pass ensures cites feel earned, not mechanical).
- Voice rules codified in `copy.ts`: short sentences, no exclamation marks, no "you got this", no diagnosis language, no certainty about future outcomes.
- One reflective question per 3 statements maximum.
- Reference observable facts (dates, prior turns, prescribed deloads), never feelings the athlete didn't self-report.

## Section 6 — Parent Trust Pass

`ParentTrustCard` copy + `RecruitingRoadmap` minor-athlete gating:
- Lead with what's protected, not what's exposed.
- Recruiting exposure language always shown beneath developmental safeguard status.
- For minor athletes, recruiter contact rows display "Parent consent required" badge sourced from existing relationship projection — no new state.

## Section 7 — Final Presentation Risk Audit

Produce `docs/asb/relational-presentation-runbook.md` containing:
- Final screen order + timing table
- Talking points per screen (3 bullets each)
- Fallback recovery: if seeded data missing → `/relational?fallback=fixture` renders from in-memory `_seed.ts` fixtures
- Known fragility points (network reload, projection cold-start latency) + mitigations
- Pre-demo checklist (seed run, visibility audit, viewport set to 440×782)

## Section 8 — Presentation Mode Lock

After this pass merges:
- Add `docs/asb/presentation-mode-lock.md` enumerating what is frozen (architecture, primitives, doctrine, major surfaces) and what remains allowed (bug fixes, copy, perf, polish, resilience).
- Update `mem://index.md` Core with one line: "Presentation mode locked — only bug fixes, copy, perf, polish, resilience until further notice."

## Technical Notes

- Zero migrations. Zero new ASB topics. Zero changes to `prepareRows`, `emit.ts`, schemas, or projection logic.
- All seeding idempotent via deterministic `event_id`.
- New files: `src/pages/RelationalDemo.tsx`, `src/lib/relational/copy.ts`, `docs/asb/relational-presentation-runbook.md`, `docs/asb/presentation-mode-lock.md`.
- Edited files: 7 components under `src/components/relational/`, `scripts/seed-relational-demo.ts` (add `--live`), `src/App.tsx` (register `/relational/demo`), `mem://index.md` (Core line).
- RR-4…RR-10 remain reserved. Phases 155–160 remain frozen.

## Out of Scope

- New relational primitives or topics
- Auth, billing, multi-athlete switching
- Real-time subscriptions
- Any change to `src/lib/runtime/projections/types.ts` or visibility firewall
