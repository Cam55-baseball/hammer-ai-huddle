# Hammers Modality — Launch Readiness Ratification

**Verdict: 🔴 NO-GO for public launch.**

This is an organism audit, not a code audit. Six parallel forensic passes were run against new/youth onboarding, pitcher journey, hitter journey, coach/parent/recruiter journeys, safety + recommendation engine + ASB + softball parity, and design/perf/report-card/AI-Hammer coherence. Findings are evidence-cited with `file:line`.

- **Launch readiness score:** 38 / 100
- **Publication readiness score:** 31 / 100
- **P0 blockers:** 16 · **P1:** 26 · **P2:** 22 · **P3:** 17

The platform's constitutional substrate (Phases 1–160, PIE V2, HIE phase doctrine, ASB event fabric) is internally coherent and well-architected. The failure mode is **integration**: the substrate is wired to itself, not to the user. Capture surfaces are unmounted, edge functions skip the doctrine, projections never write back, recommendations cannot be played, the Universal Hammers Report Card was never built, AI Hammer is a deterministic stub, and Softball PIE V2 does not exist.

---

## Journey Verdicts

| # | Journey | Verdict | Headline failure |
|---|---|---|---|
| 1 | New athlete | 🔴 Fail | Onboarding has 3 disconnected funnels; paying path never reaches Hammer surface |
| 2 | Youth (10–12) | 🔴 Fail | First screen says "Emit canonical event" and "Your organism is the source of truth" |
| 3 | Advanced athlete | 🟠 Degraded | Trends/longitudinal exist but starve — no signal writer feeds them |
| 4 | Pitcher | 🔴 Fail | PitchingV2MicroInput + PieV2FrameTagger never mounted; entire PIE V2 pipeline dead |
| 5 | Hitter | 🔴 Fail | `hie-analyze` edge function never calls hitting phase doctrine; chains/roadmaps orphaned |
| 6 | Coach | 🟠 Degraded | Roster shows raw UUIDs as names; no roster membership guard on drilldown |
| 7 | Parent | 🟠 Degraded | Invite tokens never expire; HammerParentVoice blank for normal active state |
| 8 | Recruiter / scout | 🔴 Fail | `scout_evaluations` insert violates NOT NULL on every submission |

---

## P0 — Launch Blockers (must fix before any public release)

Grouped by failure surface. Each carries a file:line citation in the per-domain reports above.

### Capture & ingestion (PIE V2 dead)
- **P0-PIE-1** `PitchingV2MicroInput` never mounted (`MicroLayerInput.tsx` absent of import).
- **P0-PIE-2** `PieV2FrameTagger` never mounted (`AnalyzeVideo.tsx` no import).
- **P0-PIE-3** `emitPieV2SessionAggregate` / `aggregateSession` never called → `usePitchingV2Trends` always empty.

### Hitting doctrine bypassed
- **P0-HIE-1** `supabase/functions/hie-analyze/index.ts` does not import `hittingPhases` / `hittingCausalChains` → snapshots have no phase attribution, no P4 cap.
- **P0-HIE-2** `HittingCausalChainCard` + `HittingRoadmapLadder` orphaned (zero call sites).
- **P0-HIE-3** `/analyze/hitting` route does not exist — `CompleteHitter.tsx` is a dead-end tile.
- **P0-HIE-4** `PieV2RecruitingCard` rendered for hitters shows pitching signals as "Mechanics Snapshot".

### Onboarding broken
- **P0-OB-1** `/select-role` route not registered in `App.tsx` — entire SelectRole flow unreachable.
- **P0-OB-2** `OnboardingFlow.tsx:199` — "All set" button permanently disabled at completion (no `navigate()`).
- **P0-OB-3** `OnboardingFlow.tsx:105` — `isMinor: false` hardcoded; DOB collected but never read → safeguarding never activates for youth.
- **P0-OB-4** Paying funnel (ProfileSetup → Activate → Dashboard) never visits any Hammer onboarding surface.

### Safety (RR-6 / Phase 31)
- **P0-SAFE-1** `injuryDetection.ts:46–51` — `factors.length >= 3` elevated branch is dead code (preceded by `>= 2` watch). Three concurrent mechanical risks with no pain → "watch" instead of "elevated". RR-6 silently under-escalates.
- **P0-SAFE-2** Phase 31 arbitration is a comment, not a route. `safeguardingRoute.ts` classifies `arbitration_required` and never delivers it. No App route, no notification dispatch.
- **P0-SAFE-3** `arm_health_caution` from `derivePieV2StateDelta` is computed but never emitted to ASB — invisible to coaches, parents, Safety Center.

### Recruiter / scout security
- **P0-REC-1** `ScoutEvaluationForm.tsx:34` — insert omits required `evaluation_date` + `sport`; every submission fails silently.
- **P0-REC-2** Parent invite token has no `issued_at` expiry check — permanent link validity.
- **P0-REC-3** `CoachAthleteDetail` accepts any UUID — no roster membership guard → arbitrary athlete event enumeration.

### Unified report card & AI Hammer
- **P0-UHRC-1** Universal Hammers Report Card does **not exist** (`src/lib/uhrc/*` absent). Per-engine cards (Scorecard, PieV2CoachPanel, PieV2HammerBriefPanel, PracticeIntelligenceCard) are not unified — 10-second comprehension test fails.
- **P0-AIH-1** `aiHammerTalkingPoints.ts` missing required fields: `biggest_win`, `biggest_leak`, `priority_fix`, explicit drill ref, video ref, trend. `recommendDrills` / `recommendVideos` exist in the library but are **not imported** by the brief — split-brain coaching.

### Recommendation engine unplayable
- **P0-REC-ENG-1** PIE V2 drill IDs (`pie_v2.drill.*`) have no bridge to the `drills` table → coaches cannot assign recommendations.
- **P0-REC-ENG-2** PIE V2 video catalog entries have no `url` / `embed_id` and no `library_videos` mapping → recommendations unplayable.

---

## P1 — Must fix before scale

Onboarding (5): dual `localStorage` role-key race; `Auth.tsx` falsely marks name-only profile as onboarded; no baseline establishment anywhere; first AI Hammer feedback unreachable from primary funnel; SelectModules back-button mis-routes.

Pitcher logic (3): `rollupAggregates` only encodes `energy_angle` — 12 signals null in cross-session trends; `pie_v2_signals` projection cache has no writer; lineage only fires from unmounted `PieV2FrameTagger`.

Hitter (4): no hitting report card on ProgressDashboard; `PHASE_DRILL_RECOMMENDATIONS` IDs never resolved against DB drill engine; AI Hammer dashboard context contains no hitting phase violation data; coach `CoachPlayerCard` has no phase visibility.

Coach/Parent/Recruiter (5): approved scout role row never persisted (session-only access); `vault_scout_grades` has no `scout_id` column (no provenance); RR-9 opt-in is ephemeral `useState` (not server-persisted consent); `parent_invite_dispatches` not written for manual-link path; raw UUIDs shown as athlete identity in Coach Console + Detail.

Safety (3): `injuryEmitters.ts` lacks `isMinor` narrowing independent of lockdown → minor injury events may reach coach scope without parent authority; `physio_*` tables disconnected from RR-6 chain; `RTP.tsx` / `Illness.tsx` have no ASB write path for authorizations.

ASB (2): `reconcileFoundationState` never emits ASB → foundation state transitions invisible to projection layer; `derivePieV2StateDelta` has zero call sites.

Softball parity (2): no signal-level scoring model for windmill pitching; hitting has no slap-specific signal scoring even though logic exists.

Design / perf (3): raw Tailwind palette throughout `TheScorecard` and Dashboard merch card; `ProgressDashboard` reads `localStorage` synchronously inside render; 15 heavy components mount unconditionally on ProgressDashboard.

---

## P2 — Can launch with mitigation (22)

- Youth-incomprehensible jargon throughout `AthleteOnboarding.tsx` ("organism", "emit canonical event", "ledger", "appended").
- `systemTone.ts` combative library-publisher language exists at a deceptively global path.
- Age verification dialog asks child to check parent's consent box — parent not authenticated.
- `SelectModules` add-mode skips auth check → unauthenticated checkout entry possible.
- `CoachingReportDisplay` rendered in `SessionDetailDialog` with no role gate (athletes see Root-Cause Analysis).
- `HammerParentVoice` returns `null` for normal active-athlete state → blank card.
- `TeamWeaknessEngine` hardcodes `sport: 'baseball'`.
- `useCoachHammerNextStep` reads coach's own ASB rows, not the player's.
- `ScoutEvaluationForm` free-text UUID input with no follow-gate.
- `ParentTrustCard` debug block rendered twice.
- `recommendDrills` returns `[]` for fully clean athletes — no maintenance / L4 surface.
- `aiHammerTalkingPoints` uses only `root_causes[0]` and `teaching_progression[0]`.
- No severity sort on `talkingPointsForSession`.
- `AnalyzeVideo.tsx` has zero PIE V2 integration.
- `pieV2SignalsToTaxonomyBucket` bridge never called from any UI.
- `recommendVideos` never called from any panel.
- Drill + video catalogs are programmatically-generated stubs (single demo cue, no `url`).
- 4 hero JPGs statically imported on Dashboard; single global `<Suspense>` for 114 lazy routes.
- `Index.tsx` "Coming Soon" rendered as a red error-styled card.
- `AthleteCommand` over-fetches 500 events for a 10-row preview.
- `PieV2RecruitingCard` shows raw `conf 0.73` decimals to scouts.
- Missingness thresholds cover only 4 prefixes — injury/psych signals stale up to 168h before flagged.

---

## P3 — Post-launch (17)

Hardcoded English DOB error string; dual toast system (`sonner` + shadcn) active; dead `onboardingCopy` export; OnboardingFlow step counter shows "0 of 5" on completion; brand logo unused on `Index.tsx`; `Index.tsx` hardcoded "H" letter logo; hero interval keeps running on hidden tab; PieV2CoachPanel silently returns null for non-baseball; CoachDigest shows raw `topic_id` strings; AcceptParentInvite navigates to `/`; duplicated follow logic across Coach/Scout dashboards; vault 12-week grade lock is client-only; BounceBackBay "section opened = complete" with no comprehension gate; offline reconciler hardcodes `actor_role: "system"`; `topicLabels.ts` missing PIE V2 / relational entries; `_shared/hittingPhases.ts` (374 lines) diverged from client `src/lib/hittingPhases.ts` (298 lines); softball stealing trainer emits no ASB events.

---

## Exact Pre-Launch Fix Order

Each wave is fully verifiable before the next begins. Estimated calendar effort assumes one focused agent.

```text
WAVE 1 — STOP THE BLEEDING (security + safety)
  1. P0-REC-1   Fix scout_evaluations insert (add evaluation_date + sport).
  2. P0-REC-3   Roster-membership guard on CoachAthleteDetail.
  3. P0-REC-2   Parent invite token expiry (24h) + server-side verification.
  4. P0-SAFE-1  Swap injuryDetection severity branches (≥3 elevated before ≥2 watch).
  5. P0-SAFE-3  Wire arm_health_caution to emitAsbEvent.
  6. P0-SAFE-2  Implement Phase 31 arbitration delivery (notify_safeguarding_role
                + safeguardingNotifications projection extends prefixes to pitching.v2.*).
  7. P0-OB-3    Read DOB → derive isMinor → pass into OnboardingFlow gateInput.

WAVE 2 — CONNECT THE ORGANISM (capture → emit → projection)
  8. P0-PIE-1   Mount PitchingV2MicroInput inside MicroLayerInput (sport-gated).
  9. P0-PIE-2   Mount PieV2FrameTagger inside AnalyzeVideo with parent_video_event_id.
 10. P0-PIE-3   Call aggregateSession + emitPieV2SessionAggregate on session close;
                add persistSession writer for pie_v2_signals projection column.
 11. P0-HIE-1   Wire hittingPhases + hittingCausalChains into supabase/functions/hie-analyze;
                add violated_phases / causal_chains / p4_severity columns + write them.
 12. P0-HIE-3   Build /analyze/hitting route + page.

WAVE 3 — MAKE RECOMMENDATIONS PLAYABLE
 13. P0-REC-ENG-1  Seed drills table with PIE V2 IDs OR add bridge resolver.
 14. P0-REC-ENG-2  Seed library_videos rows for pie_v2.video.* IDs with real URLs.
 15. P0-AIH-1     Extend PieV2TalkingPoint with biggest_win/biggest_leak/priority_fix/
                  drill/video/trend; have aiHammerTalkingPoints import recommendDrills+
                  recommendVideos so brief and panel share one codepath.
 16. P0-UHRC-1    Build src/lib/uhrc/computePillars.ts unifying PIE V2 + HIE + Foundation
                  into 6 pillars; render UniversalHammersReportCard on ProgressDashboard
                  + CoachAthleteDetail + Recruiter card.

WAVE 4 — FIX ENTRY & EXIT
 17. P0-OB-1   Register /select-role route (or delete page + references).
 18. P0-OB-2   OnboardingFlow completion: enable button + navigate to /command.
 19. P0-OB-4   ProfileSetup → Activate → /onboarding/athlete → /command (replace
               /dashboard target for first-time users).
 20. P0-HIE-2  Mount HittingCausalChainCard + HittingRoadmapLadder on Progress + Coach.
 21. P0-HIE-4  Build HittingRecruitingCard; gate PieV2RecruitingCard to pitchers only.

WAVE 5 — P1 SWEEP (must be done before scale)
   - Fix rollupAggregates to encode all 13 signals.
   - Persist RR-9 consent to a new server table (recruiting_visibility_consent).
   - Persist approved scout role row.
   - Add scout_id + RLS to vault_scout_grades.
   - Replace localStorage role keys with single useUserRole hook backed by profile.
   - Replace UUID-as-name with athlete profile lookup in Coach Console + Detail.
   - Refactor TheScorecard + Dashboard merch card to semantic tokens.
   - Add lazy/Suspense per heavy ProgressDashboard section.
   - Wire physio_* + RTP + Illness pages to RR-6 injury chain.
   - Build src/lib/pieV2-softball/ — signals + drills + videos + recommender +
     injuryDetection + emit (windmill mechanics).

WAVE 6 — P2 / P3 (post-soft-launch ok)
   - Youth-voice copy pass on AthleteOnboarding + systemTone re-scoping.
   - HammerParentVoice non-empty default state.
   - TeamWeaknessEngine sport from team context.
   - Drill/video catalogs filled with real cues + URLs.
   - Missingness thresholds for pitching.v2.* + relational.injury.* + relational.psych.*.
   - Polish bucket from P3 list.
```

---

## Go / No-Go Recommendation

**NO-GO** for public launch in current state.

**Soft-launch candidacy** (closed cohort, supervised): possible after **Waves 1–4 complete and verified end-to-end**. Wave 1 alone is the minimum legal/safety floor — without it the platform fails its own RR-6 safeguarding constitution, exposes athlete event streams by UUID enumeration, and silently drops every scout evaluation.

**Public launch candidacy:** requires Waves 1–5 complete + a fresh forensic verification audit confirming a real session produces a populated UHRC, a non-empty AI Hammer brief with a drill the coach can actually assign, and a safety event reaching the Safety Center for an `elevated` caution.

**Softball parity:** until Wave 5 PIE V2-softball ships, the product cannot truthfully be marketed as a baseball-and-softball platform. Either ship parity or scope public launch to baseball only.

The substrate is sound. The wiring is not. Fix the wiring before the doors open.