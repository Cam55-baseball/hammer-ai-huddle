## Plan: Lifestyle & Constitution intake consolidation

### Current state
- The **Lifestyle & constitution** screen is a standalone onboarding step (`ConstitutionStep.tsx`) shown during first-run setup and reachable via the HPI card’s "Add lifestyle intake" link.
- It asks for **sleep target, actual sleep, water, stress, constitutional lean, and training window**.
- Those same topics are already collected elsewhere:
  - **Fuel & Recovery step** asks sleep target + water goal.
  - **Daily Vault quizzes** (morning/night) ask hours slept, sleep quality, stress, mood.
  - **Nutrition log** tracks daily hydration ounces.
- The number inputs on the current page use `parseFloat(value) || default`, which resets the field to its default when the user clears it, making mobile editing feel blocked.
- The HPI card currently sends the user back into the onboarding flow to edit these values, which feels like an extra tab.

### Goal
Remove the standalone onboarding step and surface these questions only where they already naturally fit:
1. Onboarding **Fuel & Recovery** step (static baseline).
2. Daily **Vault quizzes** and **nutrition log** (dynamic daily values).
3. An **inline edit sheet** from the HPI card, never a full onboarding tab.

### Changes

1. **Fix the input bug first**
   - Change the sleep / water number fields to use string state while editing, parsing to number on blur or save.
   - Keep the sliders for water and stress but ensure they are not swallowed by the onboarding shell’s horizontal stepper.

2. **Build a reusable `LifestyleIntakeBlock`**
   - Captures all six fields: sleep target, typical actual sleep, water goal, stress level, constitutional lean, preferred training window.
   - Writes to `hpi:lifestyle:v1` localStorage and, during onboarding, to the `fuel-recovery` draft slot.
   - Can be rendered inline inside a step or inside a sheet/dialog.

3. **Merge into the Fuel & Recovery onboarding step**
   - Rename the step label to **"Fuel & recovery"** or **"Fuel & daily rhythms"**.
   - Keep diet style / allergies.
   - Add the `LifestyleIntakeBlock` at the bottom of `FuelRecoveryStep.tsx`.
   - On continue, persist `sleep_target_hrs`, `water_goal_oz`, and `diet_style` to `athlete_context` (existing columns) and the full lifestyle snapshot to `hpi:lifestyle:v1`.

4. **Remove the standalone Constitution step**
   - Delete the `ConstitutionStep.tsx` file from the onboarding steps.
   - Remove `"Constitution"` from the onboarding step list, `STEP_CONSTITUTION`, and the render branch in `AthleteOnboarding.tsx`.
   - Remove `constitution` from `EDIT_TARGETS`.
   - Keep `constitution` out of `ReviewAnswersStep` keys (it is already not listed).

5. **Sync daily Vault data into the HPI signal**
   - After a focus quiz is saved, update `hpi:lifestyle:v1` with the latest `sleepActualHours` and `stressLevel`.
   - After a nutrition log is saved, update `waterOz` with the day’s total hydration.
   - The HPI card will then reflect today’s real data without another manual intake page.

6. **Update the HPI card edit path**
   - Replace the "Add lifestyle intake" onboarding link with a button that opens a `LifestyleIntakeSheet`.
   - The sheet uses the same `LifestyleIntakeBlock`, so the UI stays consistent but lives inline on the Dashboard/Command surfaces.

7. **Tests**
   - Update `hpiSignal.test.ts` if needed to keep the existing baseline/constitution tests passing.
   - Add a quick Playwright check that the merged onboarding step can be filled and the HPI card updates after a daily quiz.

### Verification
- Onboarding completes without the "Constitution" step.
- Sleep target, water goal, stress, and constitutional lean entered during onboarding are reflected in the HPI card immediately.
- Daily quiz / nutrition-log updates change the HPI card within the same session.
- The number inputs can be cleared and re-typed without resetting to a default.

### Decision point
I am assuming you want the standalone **Lifestyle & constitution** step removed entirely and folded into the flows above. If instead you want to keep that page as a profile/settings screen and only fix the inputs, reject this plan and I’ll revise.