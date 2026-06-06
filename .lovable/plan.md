# P0 Launch Blocker Remediation Sprint

Scope is strictly remediation + verification of three verified P0 findings from the Launch Readiness Hostile Audit. No new features, doctrine, intelligence, UI initiatives, optimization, or roadmap expansion.

---

## RFL-033 — `compute-hammer-state` boot failure (fix first, smallest blast radius)

**Root cause.** `supabase/functions/_shared/seasonPhase.ts` declares `getSeasonProfile` twice — once at line 123 (canonical, used by `buildPhasePromptBlock` at line 129) and again at line 143 (orphan duplicate). Deno refuses to boot the function: `SyntaxError: Identifier 'getSeasonProfile' has already been declared`. Every consumer that fire-and-forgets `supabase.functions.invoke('compute-hammer-state', …)` (`useDayState`, `useEngineRecomputeTrigger`, `useQuickActionExecutor`, `useNNSuggestions`, `useRestDay`, `GamePlanCard`) silently swallows the boot error (`.catch(() => {})`), so server-side hammer-state has been stale/empty since deployment.

**Fix.** Delete the duplicate `getSeasonProfile` definition at `_shared/seasonPhase.ts:143-145`. No signature change, no behavioral change — the canonical at 123 already returns the same value. This is the minimum surgical edit.

**Verification.**
1. Re-deploy `compute-hammer-state` (and any sibling function that imports `_shared/seasonPhase.ts`).
2. Confirm boot via edge-function logs (expect `booted (time: …ms)` instead of `BootFailure`).
3. Curl the function with a real `user_id` and confirm 200 + payload shape.
4. Capture log snapshot into the ratification doc.

---

## RFL-032 — Onboarding bypass at `src/pages/Auth.tsx`

**Root cause.** Sign-in computes `hasCompletedOnboarding = hasProfile || hasSubscription || hasRole` (`Auth.tsx:122-131`). Any user who completed `/profile-setup` but never finished `AthleteOnboarding` (which is the *only* surface that emits the first canonical event via `useAthleteEvents.createEvent`) is routed straight to `/dashboard`, bypassing `HammerOnboardingChat` and producing a Hammer / daily-plan / recommendations / roadmap surface with zero canonical antecedents.

**Canonical authority.** The existing read-only hook `useAthleteOnboardingState.hasFirstEvent` is the single ledger-truth check (counts `asb_events` for the athlete). It is already used inside `AthleteOnboarding` to skip the flow once an event exists. Promote it to the gating authority at sign-in time.

**Fix (Auth.tsx, sign-in branch only — no schema changes).**
1. Add a fourth parallel query to the existing `Promise.all` block: `select event_id … from asb_events where athlete_id = uid limit 1` (head/count, athlete-scoped — same shape as `useAthleteOnboardingState`).
2. Compute `hasFirstEvent = (asbCheck.count ?? 0) > 0`.
3. Redirect rule (athlete role only — scouts and ops unchanged):
   - `isScout` → `/scout-dashboard` (unchanged).
   - `!hasFirstEvent && !hasRole && !isScout` → `/onboarding/athlete` (NEW). This catches the bypass cohort: profile exists, no canonical event, not a scout/admin.
   - Else `/dashboard` (or `returnTo`) (unchanged).
4. `AthleteOnboarding` already short-circuits to `/command` when `hasFirstEvent` becomes true, so the loop is self-terminating.

**Why nothing else needs to change.** `/dashboard`, `/command`, `HammerChat`, `HammerDailyPlan`, recommendation hooks, and roadmap hooks all already degrade gracefully on missing context — the harm is that the user lands on them with no antecedents and no orienting prompt. Gating at the auth router restores the canonical entry path without touching downstream surfaces. We do NOT add a second gate inside `/dashboard` or `/command` in this sprint — that would be scope creep into UX hardening which belongs to RFL-037/038 (P1).

**Verification.**
1. Manually trace the four entry paths in code: (a) brand-new signup → `/select-user-role` (unchanged), (b) returning user with profile + no event → `/onboarding/athlete` (NEW), (c) returning user with first event → `/dashboard` (unchanged), (d) scout → `/scout-dashboard` (unchanged).
2. Capture before/after snippets of the routing block.
3. `rg "navigate\(.*dashboard" src/pages/Auth.tsx` to confirm no orphan branch.

---

## RFL-034 — Minor-athlete supremacy not enforced in prescription

**Root cause.** `src/lib/hammer/context/decisionFilters.ts` has zero references to `parent | minor | guardian`. Lifecycle gating uses `lifecycleBand ∈ {u10,u12,u14}` for youth-blocked drills (`isLifecycleLegal`), which is age-band hygiene but does NOT honor parent-flagged concerns or minor-status supremacy. The relational doctrine in `mem://architecture/asb-megaphase-151-160` requires that for minors, parent authority constitutionally precedes coach/recruiter/commercial — including in prescription branching.

**Constitutional bounds we must respect.**
- `decisionFilters` is interpretive-only (read-path). It must NOT author organism truth, parent state, or relationship state. It consumes the spine envelope.
- No new schema, no new tables, no new RR-/EE-/etc invariant families (sprint constraint).
- `parent_athlete_links` already exists with `status='active'` representing accepted parent supremacy. `profiles.date_of_birth` exists for minor inference.

**Fix (interpretive, additive, missingness-preserving).**

1. **Extend the projection.** Add to `AthleteContextProjection`:
   - `isMinor: boolean | null` — derived from `lifecycle_band ∈ {u10,u12,u14,u16,u18}` OR `date_of_birth` projection if surfaced by the spine. `null` when both are absent (missingness-permissive per FC continuity).
   - `parentSupremacyActive: boolean` — true when the spine exposes any active `parent_link` / `relationship` projection key with `status=active` (read-only; lookup via `ctx.get<…>("parent_link_active")?.value` — the relational primitive `relationship` lands in `relational.*` namespace per Megaphase 151, but for this sprint we read whatever the spine already projects under a single key; if absent → `false`).
   - `parentConcerns: ReadonlyArray<string>` — read-only pull from `ctx.get<string[]>("parent_concerns")?.value ?? []`. Empty when absent.
   - No invention. Every value derives from the spine; missing → safe default.

2. **Tighten legality.** Add `isMinorParentLegal(tags, proj)` that returns `false` when:
   - `proj.isMinor === true` AND tags match any high-risk pattern (`max_load`, `1rm`, `weighted_ball_max`, `depth_jump_max`, `pull_down`, `max_throw`, `heavy_squat`) — superset of existing `YOUTH_BLOCKED`. Minor branch is strictly additive; adult prescription unchanged.
   - `proj.parentConcerns` includes a region/pattern token that intersects tags (e.g. `parentConcerns=["arm_load"]` blocks `max_throw`, `weighted_ball`). Pattern map mirrors the existing `INJURY_BLOCKED_PATTERNS` style.

3. **Wire into composite.** Extend `applyContextFilter` to call `isMinorParentLegal`; on illegal, push reason `minor:parent-concern:<token>` or `minor:high-risk`. This propagates automatically to every existing consumer (drill recs, workout recs, pieV2 recommenders) — no per-consumer change required.

4. **Daily plan.** Extend `dailyPlan.ts` to read `proj.isMinor` and `proj.parentConcerns`. For strength/throwing/speed blocks where the chosen template intersects parent concerns, downgrade to the next-safer template variant (same existing variant set; no new templates) and append `parent-concern:<token>` to the block `why`. If supremacy is active and a block would otherwise prescribe max-effort, force the speed-focus override path that already exists (`tempo_recovery` / `acceleration_base`).

5. **Roadmap ordering.** Extend `orderRoadmapMilestones` to suppress milestones with `max|heavy|sprint_max|throw_max` tokens when `proj.isMinor && proj.parentConcerns.length>0` (reason: `minor-parent-defer`). This mirrors the existing injury-defer suppression logic; no new code shape.

6. **Speed focus.** Inside `selectSpeedFocus`, before the existing branches, add: if `proj.isMinor && proj.parentConcerns.includes("speed_max")` → return `tempo_recovery` with rationale `"minor + parent concern (speed_max) — max-effort suppressed"`. Mirrors injury-supremacy branch already at lines 251-258.

**What we do NOT do this sprint.**
- No new doctrine. No new invariants. No RR-/EE-/etc families.
- No new tables, no schema migration, no RLS changes.
- No new UI surface. (Surfacing parent-concern reasons in the athlete UI is RFL-039+ territory — out of scope. Reasons are emitted into the existing `reasons: ReadonlyArray<string>` channel that already exists; UI consumption is a later sprint.)
- No new tests beyond extending `scripts/audits/p0-3-decision-differentiation.ts` with two minor-athlete personas.

**Verification.**
1. Extend `scripts/audits/p0-3-decision-differentiation.ts` with `minor-no-concerns` and `minor-with-concerns` personas (~30 lines).
2. Run the audit script; confirm:
   - Both new personas produce unique daily-plan fingerprints.
   - `minor-with-concerns` shows `minor:parent-concern:*` in the legality reasons of at least one prescription.
   - `minor-with-concerns` shows speed focus = `tempo_recovery` when `parent_concerns` includes `speed_max`.
   - `minor-with-concerns` roadmap suppresses any milestone matching `max|heavy`.
3. Persist refreshed evidence to `scripts/audits/evidence/p0-3-differentiation.json`.

---

## Regression verification (Section D)

After the three fixes:

1. Re-run `scripts/audits/p0-3-decision-differentiation.ts` (now including 2 minor personas → 11 total). Assert:
   - All previously unique fingerprints remain unique.
   - Speed focus distribution remains ≥5 distinct values.
   - Roadmap ordering distinct count does not regress.
2. Re-deploy + boot-check `compute-hammer-state`, `predict-hammer-state`, and any sibling that imports `_shared/seasonPhase.ts` (already deployed, but should re-verify they did not regress on the shared-module change).
3. Read-only sanity grep: `rg "getSeasonProfile" supabase/functions/_shared/seasonPhase.ts` should return exactly one definition + one internal call.
4. Read-only sanity grep: `rg "navigate\(.*onboarding/athlete" src/pages/Auth.tsx` should return exactly one occurrence (the new branch).
5. Read-only sanity grep on the differentiation audit JSON to confirm minor-persona deltas exist.

---

## Deliverables

```text
docs/asb/p0-launch-blocker-remediation-ratification.md  (NEW)
docs/asb/reality-feedback-ledger.md                     (UPDATE: RFL-032/033/034 → CLOSED)
.lovable/plan.md                                        (UPDATE: NO-GO → GO verdict with evidence refs)
```

**Ratification doc structure (per blocker):**
- Root cause (file:line)
- Fix applied (diff summary, file:line)
- Verification evidence (audit JSON ref, edge-function log ref, grep refs)
- Closure recommendation: CLOSED / PARTIAL

**Final section — Release Authorization:**
- Any unresolved P0 blockers? — answer with citation
- Any unresolved athlete safety blockers? — answer
- Any unresolved onboarding blockers? — answer
- Any unresolved authority conflicts? — answer (note: HammerChat-ungrounded is P1 from prior audit, not P0)
- Any unresolved launch blockers? — answer
- Verdict: **GO** / **GO WITH LIMITATIONS** / **NO-GO** with rationale. Expected outcome: GO WITH LIMITATIONS (P0s closed; P1s explicitly listed as non-blocking known limitations carried forward from the hostile audit).

---

## Files touched

```text
supabase/functions/_shared/seasonPhase.ts       (delete duplicate fn)
src/pages/Auth.tsx                              (gate redirect on hasFirstEvent)
src/lib/hammer/context/decisionFilters.ts       (minor + parent-concern branches)
src/lib/hammer/prescription/dailyPlan.ts        (consume minor/parent-concern)
scripts/audits/p0-3-decision-differentiation.ts (2 new personas)
scripts/audits/evidence/p0-3-differentiation.json (refreshed evidence)
docs/asb/p0-launch-blocker-remediation-ratification.md (NEW)
docs/asb/reality-feedback-ledger.md             (status updates)
.lovable/plan.md                                (verdict update)
```

No migrations. No new tables. No new edge functions. No new UI components. No new doctrine files. No `mem://` writes.
