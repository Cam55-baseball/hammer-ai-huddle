## Goal
Every activity under "Lifts" (each `WkPrescriptionCard` row) starts collapsed with only the checkbox, movement name, and a dropdown arrow visible. Tapping the arrow reveals dosage, badges, LogButton, "Why this movement", cue, reductions, and Complete/Skip.

## Scope
`src/components/hammer/WkPrescriptionCard.tsx` — this same component also renders items under Speed, Bat Speed, Conditioning, and the crossover primer, so this change applies uniformly to every prescribed item across Hammers Today (which matches the user's earlier "every single item needs a dropdown" direction).

Default state (`useState(false)`) is already correct — no change there.

## Changes in WkPrescriptionCard.tsx (lines 221–258)

Restructure the header row so only these are always visible:
- Checkbox
- Movement name
- Chevron toggle (rotates on open)

Move inside `<CollapsibleContent>` (currently always-visible, will be gated):
- Slot badge, Injury-swap badge, Override badge
- Dosage line
- LogButton

The existing `<CollapsibleContent>` block (Why / cue / reductions / Complete-Skip buttons) stays as-is and appears after the new "summary" block when opened.

Result per row when closed:
```
[ ]  Barbell Back Squat                                    v
```
When opened:
```
[ ]  Barbell Back Squat                                    ^
     [Lift]  [Injury-swap]
     3 sets × 5 reps • 75% 1RM               [Log]
     [Why this movement ▸]
     Cue: …
     [Complete] [Skip]
```

## Not touching
- `WkLiftsCard` container (already collapses closed with chevron).
- The nested "Why this movement" mini-collapsible inside details (already works).
- Completion/status logic, `mark()`, dosage computation, phase-mismatch logic — all preserved.

## Verify
- Typecheck.
- Visual: lift items start closed showing only checkbox + name + chevron; opening reveals badges, dosage, LogButton, and existing detail block.