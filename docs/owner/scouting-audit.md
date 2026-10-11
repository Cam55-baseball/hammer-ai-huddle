# Read-only scouting audit — 2026-10-11

No scouting code, data, roles, switches, deployments or scheduled jobs were changed. Evidence: committed frontend/function source plus live `information_schema`, `pg_policies`, function/trigger definitions and aggregate `count(*)` queries. Counts are not truncated row samples. No personal athlete records are reproduced.

**Labels:** WORKING = a implemented path supported by schema/policies and existing records, not a new end-to-end certification; PARTIAL = usable pieces with gaps; BROKEN = specific source/schema or authorization defect; MISSING = requested capability absent; UNVERIFIED = no affected-role runtime proof. This audit did not sign in as a coach/scout or alter relationships to demonstrate an exploit. Every runtime URL/ID attack remains UNVERIFIED; the policy defects below are concrete static findings, not claims of successful intrusion. Source is not proof that every deployed function matches it.

## 1. Roles and accounts — PARTIAL; approval enforcement BROKEN

`user_roles`: 8 active coach, 11 active scout, 79 player, 9 admin, 2 owner role rows. Distinct active accounts per role are also 8 coach and 11 scout; roles can overlap, so do not add them for a unique total. `useScoutAccess.ts` checks active roles and fails closed. `ScoutDashboard.tsx` uses role/application gating; `approve-scout-application/index.ts` implements staff approval. `scout_applications`: 19 approved, none pending in this snapshot.

Live RLS lets users insert their own player/coach/scout/recruiter roles (`Users can claim only a self-service role`) without an approval/status constraint. Live role status defaults to `active`; there is no role trigger in the queried live trigger set enforcing approval. Application INSERT similarly checks only `auth.uid() = user_id`, not an initial pending status. A caller can attempt to bypass the application UI using direct table writes. Owners alone manage other users' roles. Several functions, including `search-players` and `send-follow-request`, query role existence without active status; the latter's `.maybeSingle()` can also reject a dual coach+scout account. Role identity is not verified professional accreditation.

## 2. Organizations and members — PARTIAL; authorization BROKEN

`organizations` has **2 rows**, `organization_members` **2**, not zero at this read. `usePlayerOrganization.ts` uses `invitation_status = active`; `useCoachPlayerPool.ts` and `is_coach_of` use `status = active`. Two parallel status fields can disagree. Roster SELECT permits self, org owner or admin; an ordinary member cannot necessarily list the whole roster.

All authenticated users can read organizations; owners insert/update their organizations and manage membership. **Member INSERT additionally permits `auth.uid() = user_id` with no invite, role or initial-status check.** `is_coach_of` grants access for any pair of active same-organization members, without checking whether the viewer is a coach. Both membership status fields default to `active`, with role default `player`. Combined with self-joining, this is a high-priority access escalation risk. No membership trigger in the retrieved live set repairs it. The actual affected-role write must be tested later in an isolated copy, not by changing production here.

## 3. Follows, applications and scout context — PARTIAL; follows authorization BROKEN

`scout_follows`: 37 total: 28 accepted linked, 2 accepted follow, 6 pending follow, 1 rejected linked. `scout_context`: 1 row. `ScoutOnboarding.tsx` stores org/program, coverage and evaluation preferences; it is not organization membership. `ScoutApplication.tsx` stores application material; application file download (`download-scout-file`) restricts the two application buckets to owner/admin, not arbitrary scouts.

RLS normally limits reads to each participant/owner. Hidden-account restrictions and `enforce_block_on_follow` protect inserts/updates for hidden or blocked pairs. However, coach INSERT and UPDATE check only own `scout_id` and coach role: **no pending-only state or athlete-approval constraint**. Scout INSERT also lacks an initial-state constraint. A caller can attempt to create an already accepted relationship; coaches can approve their own outgoing requests by direct update. `respond-to-follow` verifies the requesting athlete, but a safe endpoint does not repair the direct-table hole. Player UPDATE checks old ownership and final status, not immutability of relationship IDs/type. Review identity-column changes too.

## 4. Coach context and folder permissions — PARTIAL; permission ownership BROKEN

`coach_context`: 3 rows; own-user ALL RLS. `CoachOnboarding.tsx` collects organization/program, ages, disciplines, athlete count, philosophy and seasons. It does not establish recruiting consent or confer a verified coach role.

`folder_coach_permissions`: 2 rows, with view/edit-style permission level and `revoked_at`. Frontend: `FolderPermissionMatrix.tsx`, `FolderShareDialog.tsx`, `FolderDetailDialog.tsx`, `CollaborativeWorkspace.tsx`. Related tables: `activity_folders`, `activity_folder_items`, `folder_assignments`. Folder/item RLS supports owner, assignment, template, explicit grant and primary-coach fallback; revoked explicit grants disable that fallback.

**Grant ALL RLS checks `granted_by = auth.uid()`, not that the caller owns the referenced folder.** A caller can attempt a forged permission naming another folder. Folder SELECT checks grant existence; edit functions must be audited with the same ownership rule. Revoking a folder grant does not revoke independent follow/org/primary-coach or staff grants.

## 5. Recruiting consent and recruiter contacts — PARTIAL

`athlete_recruiting_consent`: **0** current rows; audit table **1**. Fields include visibility, profile/metrics/video/contact scopes, parent authorization and guardian identity/time. Live `resolve_recruiting_scope` requires visibility + selected scope and, for minors, parent authorization with guardian timestamp. `is_minor` treats missing DOB as minor; a missing profile produces no boolean row. A physical-training waiver is not recruiting consent.

Consent RLS permits athlete-self and authorizing parent; selected staff can read resolved-visible consent. Parent UPDATE is row-level, not column-limited; athlete UPDATE is also row-level. Guardian-field ownership/immutability deserves proof. Contact cards (`recruiter_contacts`: **0**) have own-user ALL only: no player-facing SELECT policy was present. Do not assume an athlete can read a recruiter's contact card.

Shared service gate `_shared/recruitingGate.ts` checks paused accounts and permits self, `is_coach_of`, adult, or resolved scope. **Adults bypass the scope resolver**, preserving legacy follow behavior even if they turn visibility off. `is_coach_of` is broader than professional coach verification (see organizations and linked follows). The gate itself is not a full authorization check: callers must first establish role/relationship. Block handling is inconsistent outside the follow trigger.

## 6. Staff Access — PARTIAL

`wk_staff_access`: 9 grants; `wk_staff_access_log`: 35 entries. `StaffView.tsx` lets athletes grant/revoke access; owner/admin can manage grants. Staff read rows naming themselves. `staff_athlete_timeline` is security-definer, requires a non-revoked named grant and rejects scout/recruiter roles, including dual-role viewers.

**Plan details do not inherit that grant:** live `wk_prescriptions` RLS is athlete-self only; `wk_schedule_decisions` is self/admin only. `StaffView.openAthlete` queries both directly and ignores their errors, so a normal granted coach can get empty training details. UI search of `profiles` is also relationship-limited. Logging is client-written and does not prove every server read was logged. These grants are separate from `scout_follows` and folders. `wk_session_logs` is athlete-self ALL; observations and `asb_events` also have `is_coach_of` reads; HIE uses legacy `is_linked_coach`.

## 7. How people connect today — PARTIAL

1. Staff use `/scout-dashboard`; `search-players` requires scout/coach, searches names/position/hands/size/state/graduation/commitment/pro status and returns profile-scope-gated candidates. No query/filter returns empty. Limit is 50 **before** some height/weight/visibility filters, so eligible players beyond the first batch can disappear. Sport filtering uses subscription module prefixes, not an athlete's canonical sport, and can omit unsubscribed athletes.
2. `send-follow-request` normally inserts pending `follow` (or explicitly `linked`). Athlete-side `CoachSearchConnect` searches coach role rows and directly inserts a player-initiated pending linked row. Because `user_roles` SELECT is own/owner only, an ordinary player's role-based coach directory is incomplete. Verify under player auth before promising discovery.
3. `respond-to-follow` accepts/rejects only when caller equals the row's player. This source does not implement a coach accepting a player-initiated request. That reverse direction is UNVERIFIED.
4. After accepted follow: profile access for adults; minors need profile consent unless genuine-coach path. Shared video library needs accepted relationship, `shared_with_scouts`, and video gate. Accepted **linked** can confer `is_coach_of`; any accepted linked/**follow** satisfies legacy `is_linked_coach`, affecting sessions and grades. No automatic right to a player's entire General or private recap.
5. `unfollow-player` and folder/staff revoke controls exist. Revocation must remove all parallel grants, not merely one row.

## 8. Scout-facing player profile — PARTIAL; contact scope BROKEN

`/profile?userId=…`, `Profile.tsx` fetches `profiles` (whole row), target `user_roles` and `subscriptions` using caller RLS. Sections: identity/avatar and body/position/hands/location; academic/NCAA and graduation/commitment/professional info; social links; contact email; subscription/role-based sections. Source is `profiles`; target roles/subscriptions can be denied independently, producing incomplete UI. The target role influences whether player sections and action buttons render.

Profile RLS: self/owner/admin; real linked coach; accepted adult follows or scoped minor follow; consent-scoped scout visibility. Paused/under-13 restriction is **RESTRICTIVE** (not an accidental public-permissive policy). `profiles_public` is a security-invoker view of id/name/avatar/position/experience, so it respects underlying RLS.

**A readable profile exposes whole-row contact/academic fields.** `displayEmail` permits scout/coach reading a player profile without a separate `allow_contact` check; profile consent alone can therefore expose contact despite contact scope off. UI hiding is not column security. Directly querying `profiles` can read columns a rendered card omits. This is a policy-design risk even where the profile itself is legitimately visible.

## 9. The General — athlete view WORKING; scout-facing General MISSING

The current athlete General/progress landing is `ProgressLanding.tsx` (`YourProgressCard`); it is **not** a target-athlete scout dossier. Tests/baselines use `athlete_metric_observations` (`test.*`), lift history `wk_session_logs`, body weight `profiles`; progress/left-right topics are derived client-side. These queries use the signed-in user, not a scout-provided athlete ID.

Other General sections and sources (same signed-in athlete):
- pitching/readiness/workload/goals-mind topic panels: `useAthleteCommandRows` → `asb_events`; ranked with athlete context and schedule, not a separate scout target;
- season counter: `athlete_mpi_settings` and server `phase-state`; schedule: `gp_games`, `scheduled_practice_sessions`;
- game summary and drift: `useGpSignal`/`useRoadmapDeltas` → `gp_games`, `gp_at_bats`, `gp_pitches`, `gp_defense_plays`, current/prior windows;
- side splits: own `videos` plus `get_my_side_split_inputs`; scored charts owner/admin only;
- “What your records show”: dates from `gp_games`, `vault_focus_quizzes`, `videos`, `wk_session_logs`; correlations `athlete_metric_pairs` (security-invoker view, not an RLS-disabled table);
- “Your progression”: own today's `wk_prescriptions.why_payload`; classic view delegates to `ProgressDashboard.tsx`. Game IQ panel is held behind athlete availability, not switched on by scouting.

The connected journal `/vault` (`Vault.tsx`, `useVault.ts`) is also signed-in-user scoped. Section data sources:
- focus/sleep/discipline/mental trends, pain and correlations: `vault_focus_quizzes` (correlations are not causal proof);
- free/workout notes and daily history: `vault_free_notes`, `vault_workout_notes`, `custom_activity_logs`;
- nutrition/goals/supplements/meals: `vault_nutrition_logs`, `vault_nutrition_goals`, `vault_supplement_tracking`, `vault_favorite_meals`;
- saved work: `vault_saved_drills`, `vault_saved_tips`; tests/photos: `vault_performance_tests`, `vault_progress_photos` plus photo storage;
- grades/long-term goals: `vault_scout_grades`; streak/recap/countdown: `vault_streaks`, `vault_recaps`, `subscriptions`;
- physical regulation: physio hooks; vision: Tex Vision card/hooks.
No target parameter changes these queries into another athlete's General. `CoachAthleteDetail.tsx` is a different view: accepted follow check, `hie_snapshots`, `asb_events`, coach schedule/drill/compliance panels. It checks accepted follow rather than all valid org/primary-coach routes and ignores some RLS fetch failures. A scout cannot be promised the same private health/journal page.

## 10. Six-week recaps — PARTIAL; scout access MISSING

`vault_recaps`: 21; `recap_engine_settings`: 1 global record, all 12 recorded input weights 1, no disabled sections, no season overrides. `useRecapCountdown` anchors 42-day cycles to streak/subscription dates, detects missed cycles and gates the next reports. `generate-vault-recap` reads signed-in-user workout/focus/nutrition/tests/grades/goals, activities, physical/video/vision, workload and mental-health inputs; `contextEngine.ts` reads settings. `send-recap-email` implements delivery, not proof of Resend deliverability today.

Live recap SELECT permits athlete-self and owner only: coaches/scouts cannot read another athlete's `vault_recaps` by changing an ID. It contains potentially sensitive mental/health material and should not be made a general recruiting record. Follower summaries are a separate system (`follower_reports`, `get-follower-reports`, `generate-follower-reports`), with own-follower lookup and metrics gate; not the full six-week recap. Actual cycle generation/mail and settings effect remain UNVERIFIED in this read-only audit.

## 11. Scout grades — PARTIAL; owner's below-20 decimal scale BROKEN

`vault_scout_grades`: 15; position, batting-side and pitching-side child tables: 0 each. `ScoutEvaluation.tsx` supports current/future, position looks, switch-hitting and two-arm pitching, evaluator/context/date/prospect identity. `scoutingTools.ts` varies pitching tools by sport. Player confirmation is intended for official reports; self-reported grades remain distinct.

**Grade UI only offers 20,25,…80. Main hitting/power/speed/overall columns are integer; existing CHECKs enforce 20–80 on multiple tools. Decimals below 20 cannot be entered or saved in those fields.** Do not call the owner's full scale implemented. Child-save operations occur after parent insert; a child error can leave a partial report.

RLS: active evaluator inserts official reports; evaluator owns edits/deletes/reads; player sees own official only once confirmed; linked viewers see confirmed official sources; child rows inherit `can_view_scout_grade`/`owns_scout_grade`. Legacy `is_linked_coach` accepts any accepted follow without role, guardian, paused or block checks. Main self INSERT only checks `user_id = auth.uid()`, allowing an attempted fabricated official/source/evaluator payload. Live subject trigger prevents moving an attached report, requires a subject and resets confirmation when attaching a prospect; it does **not** validate initial evaluator/source/confirmation. Confirmation/source integrity is therefore not proven by the UI alone.

## 12. Players Club — PARTIAL

`PlayersClub.tsx`, `get-player-library`: video-only (practices/games arrays intentionally empty; those live in History/Calendar). Own saved videos, or `/players-club?playerId=…` for accepted follower/owner. Non-owner cross-player reads require video gate and shared flag. Scored output is stripped for non-owner/admin using `scoredGradingGate`.

Private analysis stripping is conditional on scout role and removes `ai_analysis`; the service query selects `videos.*`, including other analysis payloads. Coach-only accepted viewers do not take the scout-specific private-analysis branch. Review **all** fields (`analysis_result`, related reports), not only one property, against `analysis_public`. Existing source gating is not proof all payloads satisfy scopes. Library download/update/delete endpoints and Storage signed URLs need a separate affected-role mutation/revocation matrix; no files were downloaded here.

## 13. Video analysis reports — PARTIAL / runtime UNVERIFIED

625 videos; 189 `video_analysis_runs`; 0 `scout_video_reviews`. Tables include `video_pose_analysis`, `video_metric_runs`, `video_coaching_runs`, `video_performance_metrics`, annotations and versions. Shared `videos` RLS requires shared flag + accepted follow + adult or minor video consent; self/admin/owner have explicit access. Run/pose/coaching policies inspected are video-owner scoped, so scout raw-run access is not automatically granted by sharing a clip. `session_videos` uses the broader legacy linked/org helper without the minor scope check found in `videos`.

`get-scout-pending-reviews` establishes accepted follows then invokes video gate; it supplies shared clips and review counts. Reporting pages (`ScoutingReportPanel.tsx`, report-card components) and Players Club consume stored analysis; official score visibility remains a separate owner/admin restriction. The application download endpoint is owner/admin only, but public application buckets bypass that endpoint restriction (see storage finding below).

### Storage confidentiality — BROKEN (live configuration)

Read-only `storage.buckets` + aggregate object counts: **`videos` is public (1,345 objects)**; **`scout-letters` and `scout-videos` are public (29 objects each)**; `vault-photos` is private (9 objects). Public application SELECT policies also explicitly allow everyone. No object path or document contents were fetched or reproduced.

A public bucket serves known object URLs without athlete/follow/consent RLS on `videos`. Thus shared flag, guardian approval, revocation and private-analysis endpoint guards do **not** protect the actual raw media URL. Public bucket does not automatically prove every file was guessed or indexed; it does prove a known URL can bypass the intended confidentiality boundary. Private bucket migration/access design requires owner approval plus snapshot, and must preserve authorized playback. `vault-photos` has own-folder policies, so it is not included in this public-bucket defect. No storage settings changed.

## 14. Onboarding, academics and sport differences — PARTIAL

Scout/coach onboarding context described above; athlete profile identification includes name/DOB, position, throwing/batting hand, height/weight, state, high-school/college graduation and commitment, education/pro/affiliate status. `Profile.tsx` exposes edit/display of academic and NCAA fields.

**Academics exist:** `profiles.gpa` numeric, `sat_score`/`act_score` integer and `ncaa_id`; 8 profiles have GPA, 6 SAT, 5 ACT (presence, not independently verified transcripts). School/graduation/enrollment fields are present. No transcript verification/academic eligibility certification was proved.

Both baseball/softball routes/tools exist; sport-specific pitching tool lists differ. Search's sport membership heuristic is subscription-based; generic MLB-affiliate filters are baseball-shaped. No complete softball-equivalent recruiting taxonomy or sport-specific benchmark certification was established. Shared rows do not imply identical physical/pitching interpretation.

## 15. Minors, notifications, revocation and audit — PARTIAL

Missing DOB is conservatively minor; under-13/paused profile RLS hides accounts from non-owner/admin viewers; consent resolver requires guardian clearance for minor recruiting scopes. Current consent count zero means no recorded cleared recruiting scope, not that all minor data paths are blocked: true coach access bypasses recruiting consent, and legacy helpers/sessions/organization escalation weaken the boundary.

Tables: `coach_notifications`, `minor_guardian_notifications`, `safeguarding_notifications`, `follower_notification_prefs`, consent audit, `audit_log`, staff logs. Functions: follow response/unfollow, follower reports, `send-recruiting-match-emails`, recap email. No new notices/emails were sent. Delivery, recipient correctness, deduplication and parent reminder behavior are UNVERIFIED. Coach/scout unsolicited advertising suppression remains a standing rule, not permission to turn marketing on.

Consent audit SELECT is athlete-self; central audit owner-only; staff logs named athlete/staff/owner-admin. Logs are not complete access accounting: direct SELECT need not produce a log; client-written logs are omittable. Revocation must propagate across follows, org membership, primary/secondary coach settings, folder grants, staff grants and cached/signed URLs. `get-follower-reports` looks up own follower rows and applies metrics gate, but does not re-check current accepted follow in the inspected retrieval path; an adult legacy report can remain visible after unfollow because adult gate is always visible. Test revocation comprehensively before release.

## 16. URL/ID attack answer — NOT a security pass

Changing a URL alone does not bypass caller RLS. However the following direct-write/helper issues can make a subsequent read appear authorized. All listed tables have RLS enabled; that is necessary, not sufficient.

| Surface | Live enforcement / verdict |
|---|---|
| Roles/applications | own-row reads; broad self INSERT undermines approval — BROKEN |
| Organizations/members | org authenticated-read; member self/owner/admin-read; self-join + same-org helper escalation — BROKEN |
| Scout follows | participant read + hidden/block protections; caller-controlled accepted status/type — BROKEN |
| Coach/scout context | self-only ALL; another user's ID denied by policy — WORKING, runtime UNVERIFIED |
| Folder permissions/folders/items | grant-based read/edit; grant writer not tied to folder owner — BROKEN |
| Recruiting consent/contact cards | self/authorizing-parent/resolved reads; contact card self only; guardian-column integrity UNVERIFIED |
| Profiles/public view | scoped/follow/coach RLS + restrictive hidden rule; full-column contact disclosure — PARTIAL |
| Staff grants/logs/timeline | named grant checks, timeline rejects scouts; plan SELECT not grant-aware — PARTIAL |
| Recaps/settings | recap self/owner; settings owner-only — WORKING, scout recap MISSING |
| Scout grades and children | official/confirmed/evaluator rules, legacy helper and self-insert provenance holes — PARTIAL |
| Videos/library/reports | DB sharing checks exist; raw public media bypasses them; broader session helper/payload risks — BROKEN |
| General/journal | signed-in-user queries; no scout dossier; private health should stay private — MISSING for scouts |
| Games/pitches/at-bats/defense | self or `is_coach_of`; inherits helper escalation — PARTIAL |
| Notifications/audits | recipient/self/owner scopes; no exhaustive read logging — PARTIAL |

No attempted hostile write, player lookup or owner-only read proves an affected coach/scout can or cannot exploit these paths. Future proof must use isolated fixtures and affected roles, with raw REST/RPC and UI URL/ID tests, not just owner screenshots.

## 17. Existing game data for heat maps and spray charts — PARTIAL

`gp_games`: 8 games (sport/date/opponent/scores/positions/notes/summary/pitch count/innings/deleted flag). `gp_pitches`: 25, 13 non-null `location`; includes type/velocity/result/count/hands/perspective. `gp_at_bats`: 11, 2 non-null `exit_direction`; includes contact quality/exit velocity/launch angle/pitch location/type/results. `gp_defense_plays`: 4, 3 non-null `spray_direction`; includes batted-ball type/play/result/errors/position. Non-null does not certify a valid coordinate or representative sample.

Additional `gp_baserun_events`, `gp_subs`, dossiers, opponent hitters, document/import jobs, `gp_reports` with share token/expiry/revoked fields and `gp_v_*` split views support analysis. `ScoutingReportPanel.tsx` supplies game reporting, not proof of a complete scout heat-map product. Zone/direction data can support categorical charts; accurate continuous spray plots need normalized coordinate conventions, sport dimensions, source confidence, enough observations and missing-data handling. No heat-map feature was added. These tiny counts cannot justify population claims.

## Top security risks and defects — priority order; proposed queue only

1. **Critical: public athlete/application media buckets.** Known raw URLs bypass follow/guardian/revocation checks. `videos`, `scout-letters`, `scout-videos` are public; prepare a snapshotted private-media transition with authorized playback and link invalidation before claiming confidentiality. No change applied.
2. **Critical: approval/access self-escalation.** Lock role/application initial states, organization invite/role/state, and follow acceptance/identity columns behind verified actor permissions; repair `is_coach_of` to require actual coach authority. Existing live policies/trigger definitions show the gaps. No repair applied.
3. **Critical: forged folder grants.** Require actual folder ownership for grants and review edit helpers; snapshot before any authorized correction.
4. **High: minor/privacy boundary inconsistency.** Replace legacy any-follow helpers for sessions/grades/session videos with role-, consent-, paused- and block-aware checks; verify consent guardian fields cannot be self-certified. Preserve legitimate coaching scope distinctly from recruiting.
5. **High: contact/health/analysis over-disclosure.** Separate contact from profile scope at the server/column level; explicitly allowlist shared video fields. Never expose full General/mental-health recaps to recruiters by enabling one broad switch.
6. **High: revocation incomplete across parallel grants and stored reports.** Check current relationship on report retrieval, adult opt-out behavior and signed-URL lifetimes; centralize read audit where appropriate.
7. **High: grade provenance and scale.** Lock source/evaluator/confirmation, support the owner's exact decimal-below-20 rule with an approved definition, and save parent/children atomically. Integer 20–80 is demonstrably not that rule.
8. **Medium: staff view incomplete.** Named grant timeline works by definition, but prescription/decision policies do not grant normal coaches access; expose only authorized safe columns through one checked read path.
9. **Medium: discovery/onboarding defects.** Repair player-side coach directory permissions, dual-role `.maybeSingle()`, active-role checks, reverse connection approval, sport filter and pre-filter pagination.
10. **Medium: data completeness and product gaps.** Scout General/full recaps absent; side-grade tables empty; academics self-reported; chart samples sparse. Build a scope-specific dossier only after owner approves its data sections and minors rules.
11. **Release proof required.** Isolated multi-role test matrix for unlinked/linked/follow/org/blocked/revoked, adult/teen/under-13/unknown DOB, each consent scope, every endpoint/table/Storage path and baseball/softball; phone UI, notifications, immutable logs and no coach/scout advertising. Then present a separate implementation plan for owner approval. This audit authorizes none of those changes.
