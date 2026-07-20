## Plan: Repair athlete Hammer onboarding navigation

### What will change
- Replace the current “missing questions only” onboarding behavior with a stable ordered question flow.
- Users will be able to start at question 1, move forward question-by-question, and go back to any previous question without deleting answers.
- Replace the current **Back / Skip / Save & next** controls with clear **back arrow** and **forward arrow** navigation.
- Forward navigation will save the current answer before advancing.
- Back navigation will only move to the previous question; it will not clear, skip, or erase anything.
- Previously answered fields will prefill when users revisit a question.

### Current issue confirmed from the code
- The Hammer onboarding card currently renders `nextGap` from `openGaps[0]`, where `openGaps` filters out answers already present in the athlete context.
- That means returning users can be dropped directly into a later unanswered item, such as question 12, instead of seeing question 1 with prior answers available.
- The current Back action removes a prior item from resolved/skipped state and reopens it, which can make navigation feel destructive instead of like normal previous/next navigation.
- The UI resets `draft` to empty after save/back/skip, so revisiting a question does not reliably show the saved answer.

### Implementation steps
1. **Rebuild the onboarding director state**
   - Keep the canonical ordered athlete question list as the source of the flow.
   - Add an `activeIndex` so the UI knows exactly which question the user is on.
   - Expose `currentGap`, `currentIndex`, `totalGaps`, `canGoBack`, and `canGoForward`.
   - Stop using “first missing question” as the navigation driver.

2. **Hydrate answers into a local draft map**
   - Read existing athlete context values for every onboarding gap.
   - Store answers by `gap.id` so users can revisit any previous question and see what they already entered.
   - Preserve unsaved in-session edits while navigating.

3. **Make forward navigation save safely**
   - When the user taps the forward arrow, save the current answer if it has a value.
   - If the answer is empty, allow forward navigation only when the question is optional/skippable, preserving missingness without fabricating data.
   - Do not clear the field after moving forward.

4. **Make back navigation non-destructive**
   - Back arrow only decrements `activeIndex`.
   - It will not remove saved answers, reopen gaps, mark anything skipped, or clear fields.

5. **Update the Hammer onboarding UI**
   - Replace **Back / Skip / Save & next** with icon-based previous and next controls.
   - Show progress as the actual position, for example `1 / 16`, not just answered count.
   - Keep the current question input components, but bind them to the per-question draft map instead of one resettable `draft` value.
   - Show a clean final completion state after the last question.

6. **Protect the full onboarding page resume behavior**
   - Keep the broader onboarding step draft system intact.
   - Ensure returning to the athlete onboarding page does not force users into question 12 just because earlier answers already exist.
   - Users should be able to resume the onboarding area and still navigate through the Hammer questions normally.

7. **Validate E2E behavior**
   - Start a fresh athlete onboarding flow and confirm question 1 appears first.
   - Answer question 1, move forward, then back, and confirm the answer is still visible.
   - Move forward through multiple questions and confirm every forward tap saves the current answer.
   - Revisit onboarding with existing answers and confirm users can still navigate from question 1 through the final question.
   - Confirm no navigation action kicks the user out of the app.