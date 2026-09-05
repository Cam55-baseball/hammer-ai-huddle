# Close Today-plan input and fallback failures

## What will change

1. **Make equipment chat save real data**
   - Detect equipment statements in the Hammer chat path using a deterministic equipment vocabulary.
   - Save confirmed items through the existing authenticated equipment writer as a persistent equipment profile with a chat-specific source.
   - Return a plain confirmation listing exactly what was saved; when wording is ambiguous, show the interpreted list and ask for correction without claiming a save.
   - Refresh the athlete context and Today plan immediately after a successful save, and expose save failures plainly.

2. **Never replace a prescription with a question**
   - Replace the hitting “waiting on equipment” card with a useful equipment-free/default hitting prescription and a one-line assumption that can be corrected.
   - Replace the strength “waiting on lifting history” state with a conservative beginner-safe prescription plus an explicit assumption.
   - Audit every Today-plan modality and post-processor so missing context can narrow or soften a plan, but cannot leave a request-only or blank card.
   - Prevent completion controls when a card has no actual prescribed work; failed information saves remain visibly incomplete.

3. **Repair athlete-facing copy**
   - Replace raw context keys such as `equipment_effective` with curated labels and complete sentences.
   - Sweep Today-plan titles, reasons, steps, and missing-context prompts for slugs, internal identifiers, and half-interpolated text.

4. **Make game-day defense deliberate and visible**
   - Keep Defense visible on game days as a short, position-specific pregame primer with reduced volume and an explicit “save your legs” explanation.
   - Preserve the general-fundamentals fallback when position is unknown, with the same light game-day treatment.
   - Ensure schedule and weekly-rest processing cannot erase this game-day primer.

5. **Regression and end-to-end verification**
   - Add focused tests for equipment parsing, no-empty-card behavior, clean copy, and game-day defense.
   - Deploy and invoke the updated Hammer chat function.
   - In an authenticated preview session, submit equipment through the same card chat, verify the saved database row (`user_id`, persistent scope, equipment, chat source), refresh/regenerate Today, and record the rendered hitting and defense card text.
   - Run the relevant tests and confirm the preview build and runtime logs are clean.

## Technical notes

- Reuse `save_equipment_context`; no new table or parallel storage path.
- The signed-in account remains the only authority for the saved `user_id`.
- Equipment parsing will be deterministic and testable; the language model will not be trusted to claim persistence.
- Existing injury, safeguarding, and parent-authority restrictions continue to outrank fallback prescriptions.
