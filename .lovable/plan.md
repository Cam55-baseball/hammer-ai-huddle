# Hostile Baseball Launch Verification Sprint

Evidence-only verification pass. No new features, engines, doctrine, or polish. Challenge every prior audit. Trust only what is verifiable in the running code, the database, and the live preview.

## Operating rules

- Treat the 96% / SOFT-LAUNCH-READY verdict as **unverified** until re-proven.
- Every PASS requires a concrete artifact: file:line, SQL result, screenshot, console/network capture, or test run.
- Every FAIL requires reproduction steps + the canonical source of the broken behavior.
- No code edits in this sprint except (a) reclassification fixes that are P0 launch blockers discovered mid-audit, and (b) audit document creation. Anything larger gets logged, not fixed.

## Section 1 — Real user journey verification

Walk each persona end-to-end against the live preview + database. For each step record: route, component file:line, network calls observed, ASB events emitted, PASS/FAIL/BLOCKED.

Personas:
1. New baseball athlete — signup → onboarding → first session → first analysis → UHRC → AI Hammer → recommendation → progress
2. Pitcher — capture → PIE V2 → UHRC → Hammer → drill assignment → coach view → recruiting view
3. Hitter — capture → HIE → UHRC → Hammer → roadmap → coach view → recruiting view
4. Parent — invite → approval → visibility → safeguarding event
5. Coach — roster → drilldown → assign drill → trends → cautions
6. Recruiter / Scout — discovery → profile → intelligence view → evaluation submission

Tooling: `browser--view_preview` + `browser--act/observe/screenshot`, `supabase--read_query` against `asb_events`, `hie_snapshots`, `performance_sessions`, `drill_assignments`, `scout_evaluations`, `safeguarding_notifications`, `parent_invite_dispatches`.

## Section 2 — Hostile failure testing

Active attempts to break: onboarding, role switching, athlete visibility, recruiting visibility, RR-9 consent, parent authority, safeguarding, drill assignment, video playback, report card rendering, Hammer rendering.

For each: scripted negative case (unauthenticated access, role-mismatched UID, revoked consent, minor-as-target, missing snapshot, zero-rep state, malformed payload, replay against stale engine_version). PASS / FAIL / BLOCKED with evidence row.

## Section 3 — Data consistency audit

Verify UHRC, AI Hammer, coach surfaces, and recruiting surfaces project from a single canonical source. For each displayed numeric/state value: trace component → hook → projection → `asb_events` / `hie_snapshots` / `performance_sessions`. Flag any value that:
- diverges across surfaces for the same athlete/window
- bypasses `buildUhrcReport` / `generateHammerBrief`
- recomputes scoring locally instead of consuming canonical output

Deliverable: `docs/asb/data-consistency-audit.md` — table of `Value | UHRC | Hammer | Coach | Recruiting | Canonical source | Match? | Evidence`.

## Section 4 — Recruiting completeness audit

Audit `PieV2RecruitingCard`, scout evaluation flow, recruiter discovery, RR-9 gating, minor protection. Specifically test:
- Hitter profile shows zero pitching intelligence
- Pitcher profile shows zero hitting intelligence
- RR-9 opt-out hides aggregate cards
- Minor athletes never expose recruiter contact surface
- Scout evaluation writes only into `scout_evaluations` and never mutates organism truth

Append findings to `docs/asb/recruiting-intelligence-audit.md` (already exists) under a new "Hostile verification" section.

## Section 5 — Performance & UX audit

Measure on the live preview:
- Athlete dashboard, UHRC card, Hammer panel, coach dashboard, recruiting card, video analysis flow, session save flow

Use `browser--performance_profile` + network capture. Record: TTI, slowest XHR, duplicate identical queries, blocking spinners > 2s, empty-state correctness, debug-only surfaces still mounted in production paths.

## Section 6 — Launch blocker revalidation

Reclassify from scratch — **discard prior P0/P1/P2 labels**. For every finding from Sections 1–5 assign a fresh class based on observed launch impact, with evidence row. Output goes into Section 7 doc.

## Section 7 — Final baseball launch verdict

Deliverable: `docs/asb/baseball-launch-verification.md`

Contents:
- Per-section PASS/FAIL summary with evidence links
- Consolidated blocker table (freshly classified)
- Answers to the six diagnostic questions (what breaks / confuses / leaks / bypasses safeguards / bypasses permissions / inconsistent)
- Exact baseball launch readiness % (computed from weighted PASS/FAIL, not inherited from prior audit)
- SOFT-LAUNCH verdict (YES/NO + conditions)
- PUBLIC-LAUNCH verdict (YES/NO + conditions)
- Exact remaining work list, ordered

## Deliverables

- `docs/asb/data-consistency-audit.md` (new)
- `docs/asb/baseball-launch-verification.md` (new)
- Appended "Hostile verification" sections in `docs/asb/recruiting-intelligence-audit.md` and `docs/asb/pre-publication-audit.md`
- No source code changes unless a P0 is discovered mid-audit; any such fix is called out explicitly in the final doc.

## Out of scope

New features, new engines, new doctrine, new pillars, AI Hammer expansion, UHRC redesign, onboarding redesign, softball parity, schema changes, copy polish.

## Final return format

1. Launch readiness %
2. Remaining blockers (freshly classified)
3. Soft-launch verdict
4. Public-launch verdict
5. Recommended final sprint
