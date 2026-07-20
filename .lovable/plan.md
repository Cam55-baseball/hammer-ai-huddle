**Plan**

1. **Make “Finish onboarding” go directly into editable onboarding**
   - Update the four-card failure CTA so it opens `/onboarding/athlete?step=review` instead of the normal completed-user landing.
   - Rename the CTA to “Review missing setup” when backend diagnostics say the user is already onboarded but workout context is still insufficient.
   - Keep the normal completed-user screen available from Profile, but don’t let this error path strand users behind “already completed onboarding.”

2. **Refresh the right Hammers Today queries after onboarding edits**
   - On onboarding completion and “Open Command Center,” invalidate all workout-related query families, not only the exact `wk-rx` key.
   - Include game/practice day companion queries and athlete onboarding/context queries so the four cards regenerate against the newest answers.
   - Clear the previous failure state by forcing a fresh generation attempt when the user returns from onboarding.

3. **Fix the confirmed workout generator failure**
   - The recent backend logs show publication is being blocked by `Template bs.max requires categories: elastic_rotation`.
   - Database inspection confirmed `elastic_rotation` bat-speed movements exist, so this is a generator/selection issue, not simply unfinished onboarding.
   - Patch the bat-speed selection so `bs.max`, `bs.elastic`, and game-day primer templates always select an eligible `elastic_rotation` movement when the resolved template requires it, with safe fallback only when that template does not require elastic rotation.

4. **Improve the card error message**
   - If failure is a validator/template problem, show that the plan engine is being repaired/retried instead of telling the user onboarding is the only answer.
   - Keep missing-field messages when actual `missing_context_fields` are returned.

5. **Validate end-to-end**
   - Test the `wk-generate-daily` function for the current signed-in user/date.
   - Verify the response no longer fails with the bat-speed `elastic_rotation` template error.
   - Verify the four Hammers Today cards have a clean path to regenerate after onboarding review/finish.