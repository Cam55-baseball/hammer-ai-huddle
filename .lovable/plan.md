## Status of the Elite Lifts Rebuild

**Complete:**
- DB taxonomy (`family`, `intensity_class`, `phase_allow`, `is_eccentric_dominant`, `source_philosophy`) on `wk_movement_catalog`
- `wk_movement_overrides` table with owner-only RLS + grants
- `rationale` column on `wk_prescriptions`
- `wk-generate-daily` rewritten: session dedupe, 72h non-repeat memory, phase-allow enforcement, override-honoring, rationale writes
- `WkPrescriptionCard` renders rationale + source philosophy
- `useWkDailyPrescriptions.overrideMovement()` helper exists
- `scripts/check-no-inseason-eccentric.ts` drift guard exists

**Still missing — this plan closes them:**

### 1. Wire "Request Override" UI
`overrideMovement` is exported from the hook but no button calls it. When a card was blocked in `wk-generate-daily` it never renders (it was filtered out), so the athlete has no way to request an unlock. Add a small "Blocked movements today" affordance in `WkLiftsCard` (and `WkConditioningCard`) that:
- Fetches movements whose `phase_allow` excludes the current phase and are in-family for today's slot
- Shows name + why-blocked chip ("OS-only eccentric — blocked in-season")
- "Request 1-session override" button opens a reason dialog → calls `overrideMovement(slug, reason)` → plan regenerates and the movement appears with a rationale suffix "Override: {reason}"

### 2. Surface override provenance in the card
When a prescription came from an override, `WkPrescriptionCard` should show a distinct badge ("Override — 1 session") pulled from a new `why_payload.override` field written by the edge function.

### 3. Enforce sequence in the UI
The four cards exist but nothing pins their order. Add a fixed render order in the Hammer Daily Plan container: **Warm-up → Speed/Bat-Speed → Lifts → Practice/Game → Conditioning → Sport Block** (in-season demotes Sport Block to a short AM primer). Add a visual "Do in this order" rail so athletes cannot mistake sequencing.

### 4. Session-dedupe test + drift-guard in CI
- Add `scripts/audits/wk-dedupe-check.ts` that generates 7 sequential days for a synthetic user and asserts (a) no compound slug repeats within 72h, (b) no OS-only slug is emitted with `phase in (in_season, pre_season, post_season)` without an override row.
- Wire both `check-no-inseason-eccentric.ts` and the new dedupe check into a single `bun run audit:wk` npm script so we can invoke it on demand.

### 5. Backfill audit for existing prescriptions
Run a one-time read-only audit against `wk_prescriptions` for the last 30 days and report any historical violations (in-season eccentric, same-day dupes). Report-only — no destructive backfill.

### 6. Confirm rationale is user-legible
Current rationale joins with " • " and includes internal terms ("Class: max_effort_compound"). Rewrite the assembly in `wk-generate-daily` to produce a plain-English sentence: *"Chosen because you're in Off-Season, 2y training age, and this is a max-effort compound from Westside doctrine — you haven't done a heavy squat pattern in 4 days."*

### Technical notes
- No new tables required.
- Add `why_payload.override: { reason, actor_role, ack_date }` in the edge function when an override is consumed.
- The dedupe audit script uses the service-role client already available to `scripts/audits/*`.
- UI additions stay inside `src/components/hammer/`; no routing changes.

### Out of scope
- Coach-side override approval flow (single-session self-override is sufficient for now).
- Any change to speed/bat-speed selection (already elite-tagged).
