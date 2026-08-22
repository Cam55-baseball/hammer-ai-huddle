# Elite Level-Up — Full Coverage Pass

Decision locked from your answer: `profiles_public` stays open to any signed-in user. Scouts and coaches get name / avatar / position lookup without a consent link; the consent gate stays where it belongs — on recruiting visibility, contact, and anything beyond the public card. This gets recorded in security memory so no future scan re-flags it.

## Where we actually stand (verified this pass)

- Build is clean (`build OK`).
- Backend linter is down to 43 findings from 195: 15 functions still callable signed-out, 25 still callable signed-in, 1 security-definer view, 2 RLS-enabled tables with no policy.
- Game IQ 101 is still hard-locked behind the coming-soon screen for everyone but the owner.
- RR-5…RR-10 (narrative, injury continuity, career arc, life context, exposure, recruiter contact) are sealed as doctrine but unimplemented — that is the biggest gap between the constitution and the running app.

## Work, in order

### 1. Close the backend to zero findings

- Re-audit the remaining 40 privileged routines one by one and split them into three buckets: real client RPCs (keep the grant), trigger/maintenance-only (revoke entirely, system-only), and predicate helpers (keep, they must stay callable for RLS to evaluate).
- Convert the last security-definer view to `security_invoker`, or replace it with a definer function whose access is explicit.
- Give the two policy-less RLS tables explicit deny-all policies so "locked" is stated, not inferred.
- Re-run the linter and the security scan until both are clean, then update security memory with the `profiles_public` decision and the rationale for every routine that intentionally stays callable.

### 2. Correct Game IQ 101

It is built, authored, and animated but invisible. Run a full authoring audit across the 114 situations (starting positions, alignment correctness, sport-respective language for baseball vs softball), fix what the audit flags, do not lift the lock yet: free tier does not get a sample set, subscribers get the full module, owner keeps authoring tools. Progress and mastery flow into the athlete's roadmap like every other module when this is agreed by the owner to be made visible & shipped

### 3. Roadmapping coverage audit — every area, not just the loud ones

A single audit that answers "does every module actually feed the athlete's development plan?" for: hitting, pitching, throwing, fielding, catching, base running, speed, lifts, bat speed, conditioning, arm care, nutrition, hydration, mental, sleep, Game IQ, and game performance. For each: does it emit progress, does a weakness there become prescribed work, and does the next check say whether it moved. Anything that is a dead end gets wired into the loop. Output is a written coverage matrix plus the fixes.

### 4. Post-mastery systems — start the deferred half

Implement the two with the most athlete value first, under their sealed doctrine:

- **Injury continuity (RR-6)** — the injury report already exists; give it a continuity arc: report → adapted plan → graded return steps → explicit human authorization before full return. Never diagnoses, never prescribes medically, athlete-reported pain outranks inferred readiness.
- **Narrative continuity (RR-5)** — a replay-derived "your season so far" thread on the History hub: observational only, no invented feelings, no destiny framing, athlete can revoke any thread.
Recruiter contact, exposure, career arc and life context stay sealed until these two are proven.

### 5. Performance and reliability pass

Measure the daily plan cold-load and the calendar month view against real data, then fix the top offenders: over-fetching in Hammers Today, unbatched queries in the calendar, and any route still loading eagerly. Target is a plan that paints in under a second on a phone. Pair it with a runtime-error sweep so nothing silently throws.

### 6. Drift guards so this stays fixed

Extend `scripts/preflight.sh` with the checks this pass creates: linter-clean assertion, module-coverage assertion (every module in the matrix emits progress), and Game IQ scenario integrity. If a future change regresses one, preflight fails.

## Technical notes

- One migration for the security closeout: grant/revoke changes, the view conversion, and the two deny-all policies — additive and reversible.
- Injury continuity adds a state field and event emission on the existing injury path plus roadmap consumption — no parallel storage, it rides the canonical event fabric.
- Narrative threads are derived at read time from existing events; nothing new is authored into the ledger.
- Coverage matrix lands as `docs/audits/module-coverage-matrix.md` alongside the existing audits.

Order matters: security closeout first (it is the only item with real exposure), then Game IQ, then coverage, then the post-mastery pair, then performance, then guards.