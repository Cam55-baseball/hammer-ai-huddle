**What is actually wrong**

The card header and the movement explanation are reading from different sources:

- The card header is now resolving the athlete’s current declared phase correctly, so it shows **In-Season**.
- The movement explanation is still displaying an older persisted prescription/rationale text that was generated as **Offseason Q1**.
- The current refresh logic only auto-rebuilds when the generator version or game-day status changes. It does **not** yet treat a season-phase mismatch as stale, so stale Offseason Q1 rows can remain visible even after the athlete is in-season.

**Plan**

1. **Add phase-drift detection to Hammers Today**
   - Compare the athlete’s canonical current phase against every loaded prescription’s stored phase.
   - If any Speed, Bat Speed, Lifts, or Conditioning row says Offseason Q1 while the athlete is In-Season, mark the whole daily plan stale.
   - Auto-regenerate the day once, instead of letting mismatched cards stay on screen.

2. **Make card text use one cooperative phase source**
   - Ensure all four cards and each movement explanation render from the same resolved phase identity.
   - Do not allow the header to say In-Season while the movement details say Offseason Q1.

3. **Remove athlete-facing internal doctrine text from explanations**
   - Stop showing raw persisted rationale that includes internal phrases like “Doctrine,” “Blended elite programming,” training age labels, and old phase wording.
   - Keep “Why this movement” useful, but make it athlete-facing and phase-consistent.

4. **Regenerate stale plans when phase changes**
   - When the athlete updates or confirms their season status, invalidate the Hammers Today cache and force a rebuild if today’s prescriptions were created under another phase.
   - This fixes existing stale rows without requiring the user to manually retry every card.

5. **Verify the exact screenshot case**
   - Confirm the Bat Speed card cannot show:
     - Header: **In-Season — Strength Primer**
     - Explanation: **Offseason Q1 — Strength & Capacity**
   - Verify Speed, Bat Speed, Lifts, and Conditioning all match the athlete’s declared reality end-to-end.