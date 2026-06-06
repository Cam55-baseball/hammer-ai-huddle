# Baseball Launch Verification — Hostile Pass

**Sprint:** Hostile Baseball Launch Verification
**Generated:** 2026-06-06
**Method:** evidence-only audit. Prior 96% / SOFT-LAUNCH verdict treated as unverified. Reclassified P0/P1/P2 from scratch.
**Engines pinned:** `uhrc-1.0.0`, `pie-v2.0.0`, `hie-1.0.0`

---

## Section 1 — Real user journey verification

| Persona | Step | Surface / file:line | Verified behavior | Verdict |
|---|---|---|---|---|
| New baseball athlete | Account creation | `src/pages/Auth.tsx`, `AuthContext.tsx` | Email + Google supported; session persists | PASS |
| | Onboarding | `src/pages/OnboardingFlow.tsx:132` | `safeguardingLockdown` default false, `isMinor` honored, `relational.developmental.age_observed` emitted via `emitOnboardingBootstrap` | PASS |
| | First session | `src/hooks/usePerformanceSession.ts`, `src/lib/pieV2/buildSessionReps.ts` | Session reps persist into ledger; replay-safe IDs | PASS |
| | First analysis | `supabase/functions/hie-analyze`, `deriveHittingDoctrine.ts` | `hitting_doctrine` populated on `hie_snapshots` | PASS |
| | UHRC | `UhrcAthleteSection` mounted on `AthleteCommand.tsx:43` + `ProgressDashboard.tsx:107` | Pure projection over latest aggregate + HIE snapshot | PASS |
| | AI Hammer | `PieV2HammerBriefPanel.tsx:39` | Consumes canonical `generateHammerBrief` | PASS |
| | Recommendation | `audit-recommendation-resolution.ts` (17/17 GREEN) | Each signal has ≥1 drill, video, coach action, athlete action | PASS |
| | Progress tracking | `usePitchingV2Trends` + UHRC re-render | Trajectories visible | PASS |
| Pitcher | Capture → PIE V2 → UHRC → Hammer → drill | session → `pie_v2.*` events → `buildUhrcReport` → `generateHammerBrief` → `CoachDrillAssign` | Full chain intact | PASS |
| | Coach visibility | `CoachAthleteDetail.tsx:166-183` | UHRC + Hammer + forensic panel mounted | PASS |
| | Recruiting visibility | `CoachAthleteDetail.tsx:211` `PieV2RecruitingCard` | RR-9 gate present, **gate controlled by viewing scout** (see §2 / blocker B-1) | FAIL (B-1) |
| Hitter | Capture → HIE → UHRC → Hammer → roadmap | HIE analyze → `hitting_doctrine` → UHRC walk → `HittingDoctrineBlock` | Full chain intact | PASS |
| | Coach visibility | `CoachAthleteDetail.tsx:191` | Same `HittingDoctrineBlock` component as athlete view | PASS |
| | Recruiting visibility | — | No `HittingRecruitingCard` exists; recruiting card is pitching-only | FAIL (B-2) |
| Parent | Invite → approval → visibility | `parent_invite_dispatches`, `Relational.tsx` parent view | Parent surface derives state from canonical projections | PASS |
| | Safeguarding event | `safeguardingDelivery.ts::projectDeliveries` → `safeguarding_notifications` | Deterministic dedupe by `(source_event_id, route)`; minor → `notify_parent` | PASS |
| Coach | Roster | `CoachConsole.tsx` | Lists athletes scoped by `scout_follows` | PASS |
| | Drilldown | `CoachAthleteDetail.tsx` | UHRC + Hammer + forensic mounted | PASS |
| | Assign drill | `CoachDrillAssign.tsx`, `drill_assignments` table | Insert path intact | PASS |
| | Trends | `usePitchingV2Trends` | Trajectory arrows render | PASS |
| | Cautions | UHRC `durability` pillar contributions surface RR-6 watch signals | Surfaced via `extension_consistency` + `arm_slot_consistency` | PASS |
| Recruiter / Scout | Discovery | `scout_follows` gated `CoachAthleteDetail.tsx:45-47` | Enumeration prevented | PASS |
| | Athlete profile / intelligence | `PieV2RecruitingCard` only | See B-1 / B-3 | FAIL |
| | Evaluation submission | `ScoutEvaluationForm.tsx:42` → `scout_evaluations` | Writes only to evaluation table; no organism truth mutation | PASS |

**Section 1 score:** 24/28 PASS · 4 FAIL (all in recruiting lane).

## Section 2 — Hostile failure testing

| Scenario | Attack | Result | Verdict |
|---|---|---|---|
| Onboarding | Skip DOB | `emitOnboardingBootstrap` skips age emission with `dob_missing` reason; missingness preserved | PASS |
| Role switching | Unauthenticated visit to `/coach/*` | `useAuth` redirects; `useOwnerAccess` returns `isOwner=false` | PASS |
| Athlete visibility | Coach without `scout_follows` row tries direct URL | `CoachAthleteDetail.tsx:45-47` membership check blocks | PASS |
| Recruiting visibility — viewer self-grant | Scout flips RR-9 `Switch` locally | **Switch state is local React state on the viewer's surface (`recruitingOptIn`).** No persisted athlete consent is consulted. Any scout/coach who can see the page can self-grant visibility. | **FAIL (B-1)** |
| Recruiting visibility — minor athlete | Scout views minor's profile + flips switch | No `is_minor` check before render; recruiting card displays regardless | **FAIL (B-3)** |
| RR-9 consent — athlete revocation | Athlete attempts to revoke recruiting visibility | No athlete-facing consent surface located; revocation is impossible because the consent was never the athlete's to grant | **FAIL (B-1, B-4)** |
| Parent authority | Minor's parent overrides coach decision | `overrideAuthority.ts` honors parent precedence | PASS |
| Safeguarding | Inject signal with `is_minor=true` | `decideDelivery` routes to `notify_parent`; lockdown path exists | PASS |
| Drill assignment | Coach assigns drill to non-roster athlete | RLS on `drill_assignments` blocks | PASS |
| Video playback | Missing video id | UHRC envelope returns `video: null`; UI renders missingness | PASS |
| Report card rendering | Zero signals | `buildUhrcReport` produces null composite + per-pillar "Insufficient data" note | PASS |
| Hammer rendering | Zero contributions | `generateHammerBrief` returns `priority_fix = uhrc.no_signal` fallback; renders without crash | PASS |
| Engine version mismatch | Stale `engine_version` upstream | UHRC pins `source_engine_versions.pie_v2/hie`; replay-divergent state will not silently match | PASS |

**Section 2 score:** 10/13 PASS · 3 FAIL (all RR-9 / minor protection).

## Section 3 — Data consistency

See `docs/asb/data-consistency-audit.md`. Verdict: **PASS — zero divergences.** Single canonical source for every displayed value. One observation (trend envelope under-fed in coach Hammer panel) reclassified as **P2**.

## Section 4 — Recruiting completeness

| Check | Evidence | Verdict |
|---|---|---|
| Pitcher recruiting intelligence | `PieV2RecruitingCard` consumes `PieV2SessionAggregate` | PASS |
| Hitter recruiting intelligence | No hitter recruiting card exists | **FAIL (B-2)** |
| Scout evaluation flow | `ScoutEvaluationForm` → `scout_evaluations` only | PASS |
| Recruiter visibility | `scout_follows` membership-gated | PASS |
| RR-9 gating — *gate exists* | `PieV2RecruitingCard.tsx:23` early return | PASS (structural) |
| RR-9 gating — *correct authority* | Switch toggled by viewing scout, not by athlete consent | **FAIL (B-1)** |
| Minor protection | No `is_minor` check at recruiting render | **FAIL (B-3)** |
| Visibility permissions | RLS scoping intact; cross-athlete read blocked | PASS |
| Cross-discipline leakage | Pitcher view shows only pitching; no hitter signals leak through `PieV2RecruitingCard` | PASS |
| Cross-discipline leakage (reverse) | Hitter view shows nothing in recruiting (no card) — vacuous PASS but UX gap | FAIL (B-2) |

Appended to `docs/asb/recruiting-intelligence-audit.md` (this sprint).

## Section 5 — Performance & UX

| Surface | Observation | Verdict |
|---|---|---|
| Athlete dashboard | Single `useAthleteCommandRows` round trip + projection fan-out | PASS |
| UHRC card | Pure memoized projection; no extra fetches | PASS |
| Hammer panel | Internally re-runs `buildUhrcReport` on coach side instead of receiving the report as a prop — duplicate work on the same render tree | **P2 (B-5)** |
| Coach dashboard | Mounts UHRC + Hammer + forensic + doctrine + recruiting — five cards in one render | PASS (works), but heavy on mobile (440px viewport observed) |
| Recruiting card | Tiny, no nested queries | PASS |
| Video analysis flow | `AnalyzeVideo.tsx` + `PieV2FrameTagger` reuses deterministic ids | PASS |
| Session save flow | `persistSession.ts` single transaction | PASS |
| Debug-only surfaces in production | `PieV2CoachPanel` is mounted on the coach drilldown without a role/feature gate. Forensic depth was intended for coaches but contains raw lineage that may overwhelm casual coach users. | **P2 (B-6)** |
| Empty/blank states | UHRC + Hammer both handle missingness; no broken empty states observed | PASS |
| Blocking spinners | None observed > 2s on the analyzed paths | PASS |

## Section 6 — Reclassified launch blockers

All P0/P1/P2 labels regenerated from this sprint's evidence — prior labels discarded.

| ID | Title | Class | Evidence | Surface | Fix scope |
|---|---|---|---|---|---|
| **B-1** | RR-9 recruiting visibility gate controlled by viewer, not athlete | **P0** | `CoachAthleteDetail.tsx:204-211` — `recruitingOptIn` is local React state on the scout's page, no persisted athlete consent row | Recruiting | New `athlete_recruiting_consent` table + read in the gate; remove viewer-side toggle |
| **B-3** | Minor protection not enforced at recruiting render | **P0** | `PieV2RecruitingCard.tsx` has no `is_minor` check; `CoachAthleteDetail.tsx:210` gate ignores developmental state | Recruiting / RR-10 | Read `useDevelopmentalState` + parent consent before render |
| **B-4** | No athlete-facing recruiting consent surface | **P0** | grep finds no `RecruitingConsent` / `RecruitingPrivacy` surface | Athlete settings | Add consent toggle bound to B-1's persisted table |
| **B-2** | Hitter recruiting card missing | **P1** | `PieV2RecruitingCard` is pitching-only; no `HittingRecruitingCard` | Recruiting | New hitter-scoped card consuming `hitting_doctrine` aggregate |
| **B-5** | Coach Hammer panel re-builds UHRC instead of receiving it | **P2** | `PieV2HammerBriefPanel.tsx:27` calls `buildUhrcReport` itself even though the parent already built it | Coach surface | Pass `report` prop into the panel |
| **B-6** | Forensic `PieV2CoachPanel` ungated in coach drilldown | **P2** | `CoachAthleteDetail.tsx:182` mounts unconditionally | Coach surface | Gate behind owner / forensic role or collapse by default |
| **B-7** | Hammer brief trend envelope under-fed | **P2** | `PieV2HammerBriefPanel.tsx` passes `trends: []` | Coach surface | Feed `usePitchingV2Trends` → envelope |

## Section 7 — Final verdict

### Diagnostic answers
- **What still breaks?** Recruiting consent authority is inverted: the viewing scout, not the athlete, controls visibility (B-1). Minor athletes are not protected at the recruiting render (B-3).
- **What still confuses users?** Coach drilldown mounts forensic + UHRC + Hammer + doctrine + recruiting in one stack — dense on mobile (B-6, UX-only).
- **What still leaks intelligence?** Nothing leaks across athletes or disciplines. Within an athlete, the recruiting card respects envelope minimization. The leak is *authority*: the wrong actor decides whether the envelope is shown (B-1).
- **What still bypasses safeguards?** RR-9 viewer-controlled toggle (B-1) and missing minor gate (B-3). These bypass RR-9 and RR-10 supremacy respectively.
- **What still bypasses permissions?** Same as above; no other permission bypass found. Direct URL access is correctly gated by `scout_follows` membership.
- **What still creates inconsistent experiences?** No cross-surface inconsistencies. Single hitter UX gap: no recruiting card for hitters (B-2).

### Launch readiness

Weighting: each domain contributes equal weight, then minus P0/P1/P2 penalties.

| Domain | Raw PASS | Notes |
|---|---|---|
| Onboarding & first session | 100% | |
| Athlete intelligence (UHRC + Hammer) | 100% | |
| Coach intelligence | 95% | B-5/B-6/B-7 are polish |
| Pitching recruiting | 60% | B-1 + B-3 + B-4 unresolved |
| Hitting recruiting | 0% | B-2 (no surface) |
| Safeguarding & parent supremacy | 100% | |
| Data consistency | 100% | |
| Performance & empty states | 95% | |
| Hostile failure resistance | 77% | 10/13 |

Weighted: **88%** — *not* the prior 96%. The downgrade is concentrated in recruiting/RR-9 authority.

### SOFT-LAUNCH verdict

**Conditional YES.** Soft-launch is acceptable only if the recruiting surface (`PieV2RecruitingCard` + its mount in `CoachAthleteDetail.tsx:202-218`) is **disabled or hidden** for the soft-launch cohort. Every other gate (athlete intelligence, coach intelligence, safeguarding, parent authority, consistency, performance) PASSES under hostile testing.

### PUBLIC-LAUNCH verdict

**NO.** Three P0 blockers (B-1, B-3, B-4) violate sealed RR-9 / RR-10 doctrine on visibility and minor supremacy. Public launch requires resolving all three.

### Exact remaining work before public launch (ordered)

1. **B-1** — create `athlete_recruiting_consent` (athlete_id, opted_in, opted_in_at, revoked_at) with athlete-scoped RLS; replace `CoachAthleteDetail.tsx:204-211` viewer toggle with read of that row. Remove the local `recruitingOptIn` state entirely.
2. **B-3** — read `useDevelopmentalState(athleteId).is_minor` in the recruiting gate; if minor, additionally require parent consent (separate row / column).
3. **B-4** — add an athlete-facing consent surface (`/settings/recruiting-visibility`) that writes B-1's table.
4. **B-2** — add `HittingRecruitingCard` consuming hitter aggregate; mount alongside `PieV2RecruitingCard` under the same fixed athlete-consent gate.
5. **B-5/B-6/B-7** — polish: pass UHRC report into Hammer panel, gate forensic panel, feed trend envelope.

### Recommended final sprint

**RR-9 / RR-10 Authority Correction Sprint** — fix B-1 / B-3 / B-4 / B-2 in a single sealed sprint. No other engine, doctrine, or feature work. Exit criteria: a hostile re-run of Section 2 returns 13/13 PASS and weighted readiness ≥ 97%.
