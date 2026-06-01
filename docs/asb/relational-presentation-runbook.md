# Relational Presentation Runbook

Final runbook for the 10–12 minute Hammers Modality presentation of the relational organism substrate (Phases 152–154).

## Pre-demo checklist

- [ ] Run `bun scripts/seed-relational-demo.ts --live` once. Verify idempotency by running it twice — no duplicate events should appear.
- [ ] Confirm `/relational/demo` loads in 440px viewport (presentation device).
- [ ] Confirm "Replay proof" panel is collapsed by default on every step.
- [ ] Verify all seven components render without console errors in the Hammer voice (no jargon: no `visibility_scope`, `engine_version`, `ASB`, `RR-1`).
- [ ] Confirm the fallback URL `/relational?fallback=fixture` loads against the in-memory fixture seed.
- [ ] Battery > 60%, network checked, screen-share preview confirmed at 440px.

## Screen order & timing (≈ 11 min)

| # | Time | Screen | Talking point (one breath) |
|---|------|--------|----------------------------|
| 1 | 0:00–0:45 | Start Here | "This is one athlete. One continuous human, watched calmly across years." |
| 2 | 0:45–2:00 | Journey Map | Walk the longitudinal arc — youth intro → growth spurt → slump → recovery → competitive entry. |
| 3 | 2:00–3:30 | Developmental Stage | Show the gated transition into `growth_spurt`. Emphasize the gate held until the antecedent was real. |
| 4 | 3:30–5:30 | Slump Reload | Emotional peak. The system noticed the slump before the athlete named it. |
| 5 | 5:30–7:30 | Hammer Conversation | Read one turn aloud. Point out the citation chip — every coach turn recalls a prior moment. |
| 6 | 7:30–9:00 | Parent Trust | Protection-first framing. The parent sees the athlete before they see the recruiter. |
| 7 | 9:00–10:00 | Recruiting Roadmap | Minor-athlete gating visible. Recruiting exposure sits beneath developmental safeguards. |
| 8 | 10:00–10:30 | Injury Lifecycle | Brief — show the injury was held, not hidden. |
| 9 | 10:30–11:30 | Replay Proof | Expand the panel. Show byte-identical replay. End on: "Nothing here was improvised." |

## Tone rules (all surfaces)

- Calm, observant, accountable.
- Short sentences. No exclamation marks. No "you got this".
- One reflective question per three statements.
- Never diagnose. Never hype. Never promise.

## Highest-impact talking points

1. **One human, watched over years** — not a dashboard, not a score.
2. **The system held the slump** — it did not try to fix it before the athlete was ready.
3. **Every coach line cites a real prior moment** — no fabrication, no generic encouragement.
4. **The parent sees protection first, recruiting last** — minor-athlete supremacy is visible in the UI, not buried in policy.
5. **Replay proof** — anyone can reconstruct this athlete byte-for-byte from the event ledger.

## Fragility points & mitigations

| Risk | Mitigation |
|------|------------|
| Live DB latency on first projection load | Pre-warm by visiting `/relational/demo` once before the audience arrives. |
| Projection cold-start jitter | Allow ~600ms; if stalled, switch to `/relational?fallback=fixture`. |
| Hammer citation gap (turn rendered without `recalled_event_ids`) | Caught by `_seed.ts` Zod validation; if it slips, refresh and re-seed. |
| Network drops mid-demo | Fallback fixture seed is fully local — no network calls. |
| Audience asks for technical proof | Open the Replay Proof panel on step 9; everything is there. |

## Fallback recovery flow

If any live screen fails:

1. Navigate to `/relational?fallback=fixture`.
2. The same seven components render against the deterministic in-memory seed from `_seed.ts`.
3. Resume narrative from the current step. The audience will not see a difference — same athlete, same lineage, same citations.
4. After the demo, file a `relational_failure_event` with the dropped step and replay handle.

## Final blockers before presentation

- [ ] Live seed executed on production DB.
- [ ] Presentation device confirmed at 440px viewport.
- [ ] One full dry run completed end-to-end without falling back.
- [ ] Replay Proof panel verified to show non-empty `event_id` lineage on every screen.
