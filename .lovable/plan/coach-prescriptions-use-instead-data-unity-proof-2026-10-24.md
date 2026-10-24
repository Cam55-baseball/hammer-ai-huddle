# Coach Prescriptions ("Use instead") + Data-Unity Proof

## A.1 — Answer first (from the code, today)
- **Can a coach-sent workout replace a Hammers Today card?** No. Coach sends (custom activity templates, activity folders) are only **added alongside** on the player's Game Plan/calendar. There is no replace path, no per-category mapping to Today cards, and no safety check on coach work.
- **Which categories can a coach send today?** Only the 8 generic activity types: workout, running, meal, warmup, recovery, practice, short_practice, free_session. No hitting / pitching / throwing / fielding / baserunning / lift / speed / conditioning / vision-tool categories.

## A — Coach prescriptions for every category, with "Use instead"

### Data model (migration, owner-authorized)
1. New table `public.coach_prescriptions`: id, sender_id, recipient_id (nullable for team sends), org_id/team scope, `category` (hitting|pitching|throwing|fielding|baserunning|lift|speed|conditioning|warmup|mobility|recovery|vision), `plan_date`, exercises snapshot (Vault items or coach items, with gear labels + measure types), source_template_id nullable, `status` (pending|used_instead|added_alongside|saved_for_later|declined), safety_result jsonb, created/updated. GRANTs + RLS in the same migration: sender = connected coach/org admin for assigned athletes (existing connection checks), recipient = self.
2. Wk prescription rows gain a `replaced_by` marker (status stays in the existing enum; store `replaced_by_coach_prescription_id` in payload or a nullable column) so the replaced card reads "replaced by coach workout" and never counts as missed.

### Send flow (coach / org admin)
3. Extend the existing send dialog (SendToPlayerDialog/BulkSendDialog) with: category picker (all 12 categories), day picker, Exercise Vault picker reusing existing gear labels and measure types, team send (one row per player, each evaluated independently).

### Player flow on Hammers Today
4. Arrival card on Today for that day with three choices: **Use instead of my [category] card**, **Add alongside**, **Save for later**.
5. "Use instead" calls a server safety check (new edge function, reusing existing safety inputs: rest days, throw counts/arm ledger, volume caps, phase, age, pain, readiness). Outcomes: allowed → replace only the same-category card (no spill-over); blocked → show the reason and the safe option (trimmed dose or add alongside).
6. Accepted coach work runs through the existing GuidedCustomExercises focus mode → same autosave, Swap, completion, and logging tables as a Hammers card (custom_activity_logs, arm ledger, load). "Because" line notes coach use. Coach sees per-player status (used instead / added / saved / declined).

### Proofs (automated, 390×844, screenshots to .lovable/proofs/final/)
7. Hitting replace; pitching replace blocked by throw counts with safe option shown; lift added alongside; team send to three TEST players; data readback in each listed place; coach status view.

## B — Data-unity proof
8. `docs/owner/data-unity-matrix.md`: one row per entry kind (plan cards/focus mode, swaps, coach prescriptions, practice logs, game logs, analyses, tests, check-ins, assessment, goals, equipment memory) × where it writes × where it must show (The General Today/Performance/Growth, History, Vault, Coach View summary/plan/development/discipline, org dashboard, Scout Profile within sharing, learning loop, nightly jobs).
9. One automated test per row: write the entry, read it back from each place; fix gaps found; report pass/fail per cell.

## C — Closeout
10. Full suite + preview build; update `docs/owner/publish-checklist.md` and the by-role guide (coach prescriptions: what it is / how to use / what you'll see, for players and coaches); tick roadmap.md; TEST cleanup; report 14-item table + "Ready to publish: yes/no".

## Assumptions (correct me if wrong)
- "Use instead" is a **player choice**, never auto-applied; safety check runs server-side at choice time.
- Replaced cards keep their row (marked replaced) so History/Discipline stay honest.
- Team sends create one prescription per player; no shared state.
- Vision/timing tools category covers Tex Vision / Pick-off style items as prescription content.
- No publish, no cron, no iOS changes; migrations and edge deploys are owner-authorized by this request.

## Phasing
- Turn 1: migration + send flow + player choice card + safety function.
- Turn 2: replace/add-alongside execution, coach status view, A proofs.
- Turn 3: data-unity matrix + tests + fixes.
- Turn 4: suite, docs, checklist, report.
