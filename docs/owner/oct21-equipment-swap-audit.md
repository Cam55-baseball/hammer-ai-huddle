# Oct 21 equipment / substitution audit

## Equipment questions

| Surface | Existing source | Replacement scope |
|---|---|---|
| Athlete onboarding | `src/pages/AthleteOnboarding.tsx` → `src/components/onboarding/steps/EquipmentStep.tsx` | Shared athlete inventory question |
| Initial assessment profile review | `src/components/assessment/AssessmentProfileReview.tsx` → same `EquipmentStep` | Same question; not a second inventory store |
| Onboarding review/status | `ReviewAnswersStep.tsx`, `useOnboardingAnswerStatus.ts` | Editable equipment review and completeness status |
| Settings | No standalone equipment editor found in `src/pages/settings` / `src/components/settings` | Review/onboarding reuse must be considered, no duplicate invented |
| Owner Vault | `VaultEditor.tsx`, `ExerciseVault.tsx` | Exercise requirements metadata, NOT an athlete inventory question; retain metadata needed for legal substitution |

## Existing alternatives

- `WkPrescriptionCard` → `LiftSwapSheet` → `useLiftSubstitution`: Alternative picker, certified lift ladder / catalog family fallback; rewrites existing prescription and saves original/reason. Busy-gym equivalents exist. No conversation or today/always inventory save. Unit-changing and time-restriction alternatives can change dose; cannot be reused unguarded for the new same-dose requirement.
- `DrillAdjustDialog` → `drillSwap.ts` / fault-family alternatives → `usePlanAdjustments`: same-purpose choices and today/always adjustment memory. Existing “leave it out” option conflicts with the new never-drop instruction. Existing family and generic picks require full legality validation before AI can choose them.
- `PowerPrimerBlock`: local Alternative cycling via `papAlternatives`, not persisted as an availability answer; preserve all primer safety/throw-count controls.
- `useWkDailyPrescriptions`: movement override log followed by regeneration. Not an independent substitution engine.
- Backend generator: injury regressions and certified substitutions; preserve gates and dose authority.

## Existing memory

- `athlete_equipment_context`, accessed through `save_equipment_context`, is the canonical inventory context with session → temporary → persistent → inferred precedence; session answers expire and never overwrite durable answers.
- `athlete_plan_adjustments` holds today/always per-drill replacements/reasons, not a complete equipment inventory.
- `training_preferences.equipment` is a legacy additional read path; reconcile with canonical context instead of silently overwriting either.
- Unknown equipment currently permits only conservative work on several paths. Removing questions BEFORE a safe, saved every-card replacement exists would strand players or silently assume equipment; question removal is sequenced after that system.

## Rest findings

- Speed rest helper was uncapped; inline speed logs already use it. Speed/PAP prescription text and explanations must agree with the capped helper.
- PAP `rest_s` is the rest AFTER THE LIFT, BEFORE THE EXPLOSIVE SET. Keep it unchanged. Add a separate distance-derived rest AFTER sprint sets; changing `rest_s` to one minute would incorrectly change the lifting rule.
- Conditioning contains running, position-work and recovery/flush movements. Only declared base-running reps can count bases; do not label a flush, throw, or 43-foot pitching-distance sprint a base-running rep without an explicit prescription change.

## Acceptance status

Audit complete. Every-card AI conversation, certified same-dose replacements, scoped availability persistence and question removal remain implementation/hosted-proof work, not claims of completion.