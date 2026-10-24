# Hammers Today — consolidated publish checklist
Updated October 24, 2026. **Ready to publish: NO.** No publication, schedule, iOS, deployment or migration action was taken.

“Done” below means automated rendered proof, retained prior proof, or an explicitly separated human-only check—not proof of physical execution or live access permissions. Fixture storage never reached Lovable Cloud.

## A. Human-only checks before publishing

| Check | What must pass | Status |
|---|---|---|
| Tex Vision | Tap real targets through a complete session; return to the same exercise and confirm counted usage. A timer/result screen alone is insufficient. | Human-only — pending |
| New under-13 signup | Real parent/guardian signs; child completes the permitted signup/start flow. Never substitute an automated signature. | Human-only — pending |
| Five B exercises on a real plan | Lunge reps per leg; resisted press press reps; lateral walk steps each way; Elephant Walk steps; toe carry yards. No invented conversion from timed doses. | Human-only — pending |
| iPhone website link | Inside the actual iPhone app, open the website link and confirm Safari and same-account purchase destination. | Human-only — pending |
| Original iPhone HEVC clip | Upload an original clip and confirm playable processing/readback without manual conversion. | Human-only — pending |

### Automated and retained evidence
All paths below are project-relative. New screenshots are 390×844, rendered production components with intercepted fixture persistence, not generated athlete plans.

| Proof | Result | Evidence |
|---|---|---|
| Lift, sprint, capped sprint, conditioning, warm-up, hitting, pitching, throwing, fielding, baserunning, recovery | Done: entry → Next → save → prescribed rest → Set 2; rest survives reload; Skip, Save & exit and X. Sprint 30 yd = 180 s, 60 yd capped at 300 s. Conditioning 30 s, fourth base resets at 300 s. | `.lovable/proofs/final/matrix-final.json`, `<type>-entries/focus/next/advance.png`, `conditioning-base-4.png` |
| Every listed card's instructions label | Done: rendered labels; coach uses its existing equivalent instructions-below heading. | Same entry screenshots; `coach-lifecycle-autosave.png` |
| Coach create → send → accept → focus → continuous autosave and controls | Done with real editor, send/accept hooks and logger; mocked storage only. Coach Next/save/30-second rest/advance, Skip, Save & exit/reload and real dialog X/reopen/reload pass. | `.lovable/proofs/final/coach-result.json`, `coach-focus-result.json`, `coach-close-result.json`, `coach-send.png`, `coach-accept.png`, `coach-lifecycle-autosave.png`, `coach-focus-*.png`, `coach-detail-X-*.png` |
| Five study roles plus populated hitter games/flags | Done with explicit synthetic inputs; no engine outputs fabricated. | `.lovable/proofs/final/study-*.png`, `matrix-final.json` |
| Pick-off launch, recorded fixture rep, save/return, counted usage, reload | Done with production page and parent readback; session recording intercepted. Does not certify a physical throw or decision. | `.lovable/proofs/final/tools-result.json`, `pickoff-launch.png`, `pickoff-summary.png`, `pickoff-return-counted.png` |
| Tex launch and exact-card return | Done; target taps/completion remain human-only. Automated check establishes launch destination and return, not full module rendering. | `.lovable/proofs/final/tex-result.json`, `tex-launch.png`, `tex-return.png`; prior real launch `.lovable/proofs/oct24-cleanup/tex-in-card.png` |
| B fields, broad jump ft/in, hold time target, upper-body power reps, moving plank reps | Done: nine individual exercise screens and assertions. | `.lovable/proofs/final/units-result.json`, `*-field.png`, `units-jump.png`, `units-yards.png` |
| Identity progress/return-to-training placement | Done, retained real-player proof. | `.lovable/proofs/oct24-cleanup/pitcher-identity-merged.png` |
| Earlier Delaycam, drawer, identity rewards/Coach Hammer, midnight-line removal, hundredths | Done, retained; not re-proven. | `roadmap.md` rows 1, 3–7, 13 retain exact paths |
| Fresh full application suite | Done: 514 files, 4,034 passed, zero failed. Server suite not rerun; server code unchanged. | `.lovable/proofs/final/full-suite.json` |
| Preview | Done: latest preview log reports build OK, 05:48:35 UTC. | `/tmp/observability/build-errors.log` |

### Cleanup and exact remaining blockers
- This run created no hosted TEST records; all new fixtures are browser-local.
- Fresh exact-ID readback of protected Oct24 snapshots: zero remaining coach templates/logs and Tex results/sessions. Earlier cleanup is retained.
- The three existing TEST personas remain system accounts. Their Oct24 assessment/start changes have **no verified before-state snapshot** in the located files or protected snapshot tags. They were not reset to guessed nulls or deleted.
- Therefore restoration and a global “no TEST rows outside kept hidden accounts” claim remain unverified. An actual before-state backup is required for exact restoration.
- Coach full focus controls now pass in the rendered fixture harness. The separate real outer-dialog X proof preserves already-saved work and running rest; it does not claim X flushes an unfinished write.

## B. After publishing: live checks
Only after the owner explicitly publishes; these do not replace section A or authorize publication.

- Player: reload the same saved day, log a real set, confirm the correct rest and unchanged exercise/dose.
- Coach: open only connected, permitted players; verify the accepted workout and saved entries read back.
- Parent: confirm child protections and consent boundaries remain intact.
- Organization: confirm only assigned players are visible and existing plan access is unchanged.
- Scout: confirm only authorized recruiting records open; revocation immediately removes access.
- Purchase: verify real confirmation grants the purchased access; missing confirmation never claims success.
- Review current error logs for new failures. Leave schedules and release switches unchanged unless specifically authorized.

## C. By-role guide

| Role | What it is | How to use | What you'll see |
|---|---|---|---|
| Player | Your saved daily work and study | Open Before you start; open a card; Start; enter performed work; Next; wait for rest. Use Skip or Save & exit when needed. | One activity at a time, instructions, labeled targets, saved progress, equipment-safe Swap and available tools. X closes the card; do not assume it flushes an unfinished write. |
| Parent | Child protection and permitted sharing | Complete real consent/signature requests and review sharing choices. | Required age protections; no invented guardian approval. |
| Coach | Connected-player work and accepted workouts | Create and send a template; player accepts; review authorized saved work. | Actual recorded sets and entries, only within current connections and health consent. |
| Organization | Assigned athletes and staff coordination | Use organization tools and assignments under the existing plan. | Only permitted assigned athletes, testing-day details and saved records. |
| Scout | Consented recruiting information | Request/connect through the existing inbox; open shared profiles deliberately. | Authorized source/date-labeled information; revoked or unshared data stays closed. |
| Owner/admin | Internal review and release control | Review proof paths, human checks and remaining cleanup blockers before authorizing publication. | Internal Report Card/Game IQ labels; neither is advertised or exposed to ordinary players. |

No refunds/results promises, fabricated measurements, consent bypass, or new training dose are introduced.
