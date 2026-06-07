## Final Production Release Verification — Execution Plan

This sprint is verification-only. No code, schema, doctrine, intelligence, or feature work. The exit is a single verdict: **RELEASE AUTHORIZED** or **RELEASE NOT AUTHORIZED**.

### Step 1 — Evidence sweep (read-only)

Re-verify the surfaces that prior sprints touched, using `code--view` / `rg`:

- `src/pages/Auth.tsx`, `ProfileSetup.tsx`, `ResetPassword.tsx` — confirm all athlete post-auth flows route to `/command` (RFL-053 closure).
- `src/pages/AthleteCommand.tsx` — confirm onboarding gate, `HammerOnboardingChat`, `HammerDailyPlan`, `HammerChat`, `UhrcAthleteSection`, `CommandCenterSection`, `RecentEventsPreview` all mount.
- `src/lib/hammer/prescription/dailyPlan.ts` + `context/decisionFilters.ts` — RFL-034 minor-supremacy gates intact, 9/9 modalities present, no dead-end routes.
- `supabase/functions/_shared/seasonPhase.ts` + `compute-hammer-state` — RFL-033 dedupe intact.
- `src/App.tsx` — `/command`, `/dashboard`, `/onboarding/athlete`, `/select-user-role`, recommendation/roadmap routes resolvable.
- `scripts/audits/p0-3-decision-differentiation.ts` evidence — confirm P0-3 differentiation still passing.
- `docs/asb/reality-feedback-ledger.md` — enumerate every still-OPEN RFL and re-classify.

### Step 2 — Journey traversal (documentation only)

Walk each persona on paper against the verified code:

1. Brand-new athlete: `/auth` → role select → sport/profile setup → `/command` (onboarding-gated) → `HammerOnboardingChat` → daily plan → first recommendation → first workout route.
2. Returning athlete with events: `/auth` → `/command` directly → today's plan, chat, UHRC, command center.
3. Returning athlete without first event: `/auth` → `/onboarding/athlete` → `/command`.
4. Minor athlete: confirm `decisionFilters` + `dailyPlan` suppress non-parent-authorized prescriptions.
5. Scout / coach / parent: unchanged routing — no regression.

For each: log dead-ends, ambiguity, missing next action, authority duality.

### Step 3 — Coherence, trust, retention review

- **Coherence (Section C):** verify Hammer ⇄ Daily Plan ⇄ Recommendations ⇄ Roadmap ⇄ Progress all sourced from the spine envelope; document any contradictions found.
- **Trust (Section D):** for each major recommendation surface, record whether "why / why now / why me" lineage is exposed inline. Carry forward RFL-055/056 as known gaps.
- **Retention (Section E):** D1 / D7 / D30 / D90 — what is visible, what changes, what hooks exist. Carry forward RFL-052/058.

### Step 4 — Open RFL re-classification (Section F)

Pull every OPEN RFL from the ledger, challenge severity, and label each as:
- **Release blocker** (must close before authorization)
- **Pre-launch improvement** (V1.x)
- **V2 item** (post-launch)

No severity inflation. Any item re-classified to release blocker forces **NOT AUTHORIZED**.

### Step 5 — Verdict

Based on Steps 1–4:
- If zero release blockers remain → **RELEASE AUTHORIZED with accepted limitations**.
- If any genuine blocker surfaces → **RELEASE NOT AUTHORIZED** + blocker list, no V1 ratification doc.

### Deliverables (files written in build mode)

1. **`docs/asb/final-production-release-verification.md`** — Sections A–I with evidence cites, journey traces, coherence/trust/retention findings, open-RFL re-classification, verdict.
2. **`docs/asb/hammers-modality-v1-ratification.md`** — only if AUTHORIZED. Contains constitutional completion status, audit history, blocker history (RFL-032/033/034/053), accepted limitations, V2 workstream inventory (carried RFLs grouped).
3. **`docs/asb/reality-feedback-ledger.md`** — append final verification note; no new RFLs unless verification discovers one.
4. **`.lovable/plan.md`** — update status to the issued verdict.

### Out of scope

No code changes. No new RFLs unless the verification itself uncovers a genuine new blocker. No /today merge, no /dashboard rework, no copy edits, no new components. Those remain V2 per `post-mastery-expansion-roadmap.md`.

### Expected outcome

Given RFL-032/033/034/053 all closed and prior audits confirming P1/P2-only debt, the expected verdict is **RELEASE AUTHORIZED** with the disclosed launch-debt list from `.lovable/plan.md` carried into the V1 ratification doc as accepted limitations. The plan does not pre-commit to this — Step 4 governs.
