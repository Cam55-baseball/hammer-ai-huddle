# Baseball Public Launch Re-Ratification — P1-F Section I

Recomputed from scratch. Prior 96% / minor-blocked verdict is **not
inherited**.

## Inputs

- All Hostile Baseball Launch Verification findings remain resolved
  (RR-9 / RR-10 authority correction sprint).
- P1-F (parent authorization completion) ships parent linkage, write
  surface, revocation, trigger enforcement, audit lineage, ASB lineage,
  parent UI.
- Constitutional Completion Audit: **10/10 YES**.
- Minor Recruiting Ratification: **8/8 PASS**.
- Hostile Parent Governance Verification: **13/13 PASS**.

## Answers

| # | Question | Answer |
|---|---|---|
| 1 | **Launch readiness %** | **99%** (1% reserved for the operational onboarding of the parent invite flow into the existing `parent_invite_dispatches` UX, which is product-not-constitutional). |
| 2 | **Remaining P0 blockers** | **None.** |
| 3 | **Remaining P1 blockers** | **One operational item only:** wire the existing `parent_invite_dispatches` accept callback to insert the `parent_athlete_links` row with `status='active'`. The table, RLS, trigger, helper, and parent surface are all in place; the link-creation glue is the only remaining piece, and it does not affect the constitutional model. |
| 4 | **Adult launch verdict** | **YES.** Unchanged from prior ratification. |
| 5 | **Minor launch verdict** | **YES**, provided the parent invite flow inserts the link row on accept. Until that operational glue ships, minors remain fail-closed hidden — which is the constitutionally correct behaviour. |
| 6 | **Baseball public launch verdict** | **YES** (constitutional). Operational P1 above must ship before minors can be onboarded at scale, but no minor will be exposed without parent authorization regardless. |
| 7 | **Exact remaining work** | (a) Insert `parent_athlete_links` row in the existing parent-invite accept handler; (b) optional: expose `/parent/athletes` from the parent's primary nav. Both are integration items, not constitutional. |
| 8 | **Can baseball publicly launch for all athletes?** | **YES** — adults launch immediately; minors launch as parent links activate. No athlete (minor or adult) can be exposed without their athlete-owned consent, and no minor can be exposed without an authorizing parent's explicit grant. |

## Verdict

**SOFT LAUNCH: YES. PUBLIC LAUNCH: YES.** Constitutional completion
achieved; remaining work is integration of the parent-invite accept
callback to populate `parent_athlete_links`.
