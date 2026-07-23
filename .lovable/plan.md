Plan: integrate the new hitting philosophy concepts into the existing Hitting Doctrine surface (client-side copy + edge function mirrors), identical for baseball and softball, with both athlete and coach voices.

What we will change:

1. Update `src/lib/hittingCausalChains.ts` (and its mirror `supabase/functions/_shared/hittingCausalChains.ts`) to weave the new concepts into the P1, P2, and P4 cause→effect chains:

- **P1 Hip Load** — back hip load, leg-load size creating launch angle and power, scap pack coiling the hip, establishing midline, and preserving separation.
- **P2 Hand Load** — hand/scap/knob load, "top triangle" (Sadaharu Oh), elbow and back-knee relationship, hands staying back to create the bottom triangle.
- **P4 Hitter's Move** — only the elbow or front of the bicep goes forward while hands stay back, barrel delivered behind the ball, "square to fair", on-plane contact, low-effort velocity.

Each updated chain keeps the existing trigger/cause/mechanism/result/fix structure but enriches the athlete and coach language with the new philosophy cues.

2. Update `src/lib/hittingPhases.ts` (and its mirror `supabase/functions/_shared/hittingPhases.ts`) to refresh the phase `summary` strings and failure-symptom language so the one-line definitions match the new chain copy.

3. Add philosophy reminder cues inside `src/components/hitting/HittingDoctrineBlock.tsx`:
   - A small, rotatable "Philosophy reminder" chip/drawer below the roadmap that surfaces one of the new concepts per view (e.g., "Hands back — elbow or bicep forward brings the barrel").
   - Reminders are derived from the same canonical chain data, so they stay in sync and do not introduce a second source of truth.

4. No database changes are needed; this is purely client-side copy and edge-function mirror updates.

5. Verify the build and run a type check to ensure the edge-function mirrors remain in sync with the client types.

What we will NOT do:
- Create a separate "Hitting Philosophy" reference page.
- Change the phase structure (P1→P2→P4→P3 emerges remains intact).
- Add sport-specific softball variants beyond what already exists in the slap path.

The result: hitters see the new philosophy cues inside the existing Hitting Doctrine cards and roadmap, reinforced by rotating reminders, with the same voice for both baseball and softball.