
# RR-9 / RR-10 Authority Correction Sprint — Plan

Constitutional correction only. No features, no UHRC/Hammer/onboarding work, no softball. Scope is exactly the six blockers (B-1, B-2, B-3, B-4) plus hostile reverification and public-launch ratification.

---

## Section A — RR-9 athlete-owned consent authority

**New canonical table `public.athlete_recruiting_consent`** (single source of truth, replay-safe):

- `athlete_id uuid PRIMARY KEY` (FK → `profiles.id`)
- `visibility_enabled boolean NOT NULL DEFAULT false`
- `parent_authorized boolean NOT NULL DEFAULT false` (mandatory `true` for minors before visibility resolves to ON)
- `last_changed_at timestamptz NOT NULL DEFAULT now()`
- `last_changed_by uuid NOT NULL` (must equal `athlete_id` or documented override actor)
- `engine_version text NOT NULL DEFAULT 'rr9-1.0.0'`

**Audit lineage table `public.athlete_recruiting_consent_audit`** (append-only):
- `id`, `athlete_id`, `previous_state jsonb`, `new_state jsonb`, `changed_at`, `changed_by`, `actor_role`, `reason text`

**RLS (fail-closed):**
- `athlete_recruiting_consent` SELECT: `athlete_id = auth.uid()` OR (consent row resolves to ON AND viewer has `coach`/`recruiter`/`scout` role with active relationship). Write: `athlete_id = auth.uid()` only.
- Audit table: SELECT athlete-self only; INSERT via trigger on consent updates (SECURITY DEFINER function records prev/new).
- GRANT block per project rules; no `anon` access.

**ASB lineage:** every write emits `relational.exposure.consent_changed` via existing `emitAsbEvent` (RR-9 namespace). Replay reconstructs visibility deterministically from audit table at pinned `engine_version`.

**Read path:** new hook `useRecruitingConsent(athleteId)` → returns `{ visibility_enabled, parent_authorized, is_minor, resolved_visibility }`. `resolved_visibility = visibility_enabled && (!is_minor || parent_authorized) && !active_safeguarding_flag`.

**Doc:** `docs/asb/rr9-authority-ratification.md` with the six required sections (owner, storage, read, write, audit, replay).

---

## Section B — RR-10 minor protection enforcement (fail-closed gate)

New shared gate component `RecruitingVisibilityGate` (single chokepoint):

```text
useRecruitingConsent + useIsMinor + useParentAuthorization + useActiveSafeguarding
  → if any check missing or false → render null + emit relational.exposure.gate_blocked
  → only if all PASS → render children
```

- Replace the local `recruitingOptIn` React state in `src/pages/CoachAthleteDetail.tsx:204-211` with the gate. Remove the scout-controlled `Switch`.
- Apply the gate to **every** recruiting-surface mount: `PieV2RecruitingCard` (pitcher) and new `HittingRecruitingCard` (hitter). No alternate paths.
- Server-side RLS on `athlete_recruiting_consent` enforces the same rule — direct query, query-string, role-switch, and cache-replay bypasses all fail at the database boundary.

---

## Section C — Athlete-owned consent surface

New page `src/pages/RecruitingConsent.tsx` (athlete-only route `/athlete/recruiting-consent`):

- Toggle: enable / disable visibility
- Read-only panels: current resolved status, minor/parent status, parent-authorization status, active recruiter relationships, audit history (last 20 from `athlete_recruiting_consent_audit`)
- Consequences copy (RR-9 compliant — observational, non-coercive)
- Write path: `useRecruitingConsent().setVisibility(next)` → upserts row, trigger writes audit row, ASB event emitted
- Route guarded so only `auth.uid() === athleteId` reaches it; no coach/scout/recruiter route exists.

Add entry point from `AthleteCommand.tsx` settings area.

---

## Section D — Hitter recruiting parity (projection only)

New `src/components/recruiting/HittingRecruitingCard.tsx`:

- Consumes canonical hitter intelligence already in repo: `useHIESnapshot` + `useHittingDoctrine` + `buildUhrcReport({ disciplines: ['hitting'] })`.
- Mirrors `PieV2RecruitingCard` structure (signal tile + trajectory arrow + confidence/missingness).
- Zero new scoring, ranking, or recruiting logic.
- Mounted in `CoachAthleteDetail` behind the same `RecruitingVisibilityGate`.
- Cross-discipline leakage check: pitcher card ignores hitting signals and vice versa (already enforced; verify in tests).

---

## Section E — Hostile recruiting reverification

Scenario matrix executed against live preview + `supabase--read_query`:

| # | Scenario | Expected |
|---|---|---|
| 1 | Athlete consent ON, adult | render |
| 2 | Athlete consent OFF | hidden + gate_blocked event |
| 3 | Minor, parent_authorized=false | hidden |
| 4 | Minor, parent_authorized=true, consent ON | render |
| 5 | Scout direct link with consent OFF | hidden (RLS denies) |
| 6 | Coach direct link with consent OFF | hidden |
| 7 | Role-switch (scout→coach mid-session) | hidden |
| 8 | Revoked consent (ON→OFF) | next paint hidden, audit row written |
| 9 | Stale React Query cache after revoke | invalidated on consent_changed event |
| 10 | Replay reconstruction at prior engine_version | deterministic resolved_visibility |
| 11 | Unauthorized API access (anon) | RLS denied |
| 12 | Recruiter discovery + profile access without active RR-4 | hidden |

Each row: PASS/FAIL/BLOCKED + evidence (file:line, SQL result, screenshot).

---

## Section F — Constitutional compliance audit

`docs/asb/recruiting-constitutional-compliance.md` answers the 10 RR-9/RR-10 questions YES/NO with evidence pointers (file:line, table, RLS policy name, ASB topic).

---

## Section G — Public launch ratification

`docs/asb/baseball-public-launch-ratification.md` — recompute from scratch (no inheritance of the 88% number):

1. Readiness % (weighted from fresh per-gate PASS/FAIL)
2. Remaining P0 / P1 blockers
3. Soft-launch verdict
4. Public-launch verdict
5. Exact remaining work list
6. YES/NO public-launch eligibility today

Update `docs/asb/pre-publication-audit.md` and `docs/asb/recruiting-intelligence-audit.md` hostile appendices to reflect the closed B-1/B-3/B-4 and (newly closed) B-2.

---

## Technical change list

**Migration (single file):**
- `athlete_recruiting_consent` table + GRANTs + RLS + policies
- `athlete_recruiting_consent_audit` table + GRANTs + RLS + policies
- `record_recruiting_consent_change()` SECURITY DEFINER trigger function + trigger
- `is_minor(uuid)` helper (SECURITY DEFINER) reading `profiles.date_of_birth` if present, else `profiles.is_minor`

**New files:**
- `src/hooks/useRecruitingConsent.ts`
- `src/hooks/useIsMinor.ts`
- `src/components/recruiting/RecruitingVisibilityGate.tsx`
- `src/components/recruiting/HittingRecruitingCard.tsx`
- `src/pages/RecruitingConsent.tsx` + route registration
- `src/lib/asb/topics/exposure.ts` (consent_changed + gate_blocked emitters; thin wrappers on `emitAsbEvent`)
- Tests under `src/components/recruiting/__tests__/` and `src/hooks/__tests__/`

**Edited files:**
- `src/pages/CoachAthleteDetail.tsx` — remove local `recruitingOptIn` state and scout Switch; wrap pitcher + hitter cards in `RecruitingVisibilityGate`
- `src/pages/AthleteCommand.tsx` — link to consent surface
- `src/App.tsx` (or router file) — add `/athlete/recruiting-consent` route

**Docs (new):**
- `docs/asb/rr9-authority-ratification.md`
- `docs/asb/recruiting-constitutional-compliance.md`
- `docs/asb/baseball-public-launch-ratification.md`

**Docs (updated appendices):**
- `docs/asb/pre-publication-audit.md`
- `docs/asb/recruiting-intelligence-audit.md`

**Out of scope (explicit):** UHRC changes, Hammer brief changes, onboarding redesign, softball pipelines, new scoring engines, new pillars, copy polish on non-recruiting surfaces.

---

## Return on completion

1. Constitutional audit (Section F)
2. Hostile verification matrix (Section E)
3. Launch readiness % (Section G, recomputed)
4. Remaining blockers (fresh classification)
5. Soft-launch verdict
6. Public-launch verdict
7. Recommended next sprint
