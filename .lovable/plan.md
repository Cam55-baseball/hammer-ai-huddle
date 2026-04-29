# Hitting rep logging fixes: Movement selector visibility + "Missed" contact quality

Two issues to fix in the hitting rep logging form (`src/components/practice/RepScorer.tsx`):

## 1. Movement Direction (+/−/up/down/left/right) selector not showing for hitting

The `PitchMovementSelector` (the arrow grid for pitch movement) is currently rendered at the very bottom of the form (line 1512), AFTER the entire hitting block (lines 801–1129) AND a long pitching-only block (lines 1132–1509). On hitting sessions the pitching block is skipped, so it should render — but in practice users are missing it because:

- It sits below the "Advanced" sub-section, well below the contact quality / swing decision area where the user expects pitch context to live.
- Some narrow conditions (e.g. specific rep sources or layout reflows) can push it off-screen or below the Add Rep button.

**Fix:** Move the Movement Direction selector INSIDE the hitting block, positioned right after Pitch Type / Pitch Location / ABS Guess (around line ~938) and BEFORE Swing Decision. This:
- Guarantees it always renders for hitting (no longer dependent on the form's tail).
- Puts it next to other pitch-context controls where users intuitively look for it.
- Keep the existing copy at line 1512 ONLY for `isPitching` (i.e. change condition from `(isHitting || isPitching)` to just `isPitching`) so pitching keeps its current placement.

## 2. Add "Missed" to Contact Quality

The `contactOptions` array at line 206 currently has: Barrel, Solid, Flare/Burner, Miss-hit/Clip, Weak, Whiff. The user wants an explicit **Missed** option (distinct from "Whiff" — Whiff = swung and missed; "Missed" = the user missed/didn't connect for any other reason, e.g. took the pitch when they meant to swing, foul tip miss, etc.).

**Fix:** Add a new option to `contactOptions`:
```ts
{ value: 'missed', label: '🚫 Missed', color: 'bg-slate-500/20 text-slate-700 border-slate-300' }
```
Placed between `weak` and `whiff` so the severity progression reads naturally. The same `contactOptions` array is reused inside the pitcher-vs-hitter outcome panel (line 1387), so that picker gets the new option automatically.

No DB migration needed — `contact_quality` is a free-form text column already.

## Files

- `src/components/practice/RepScorer.tsx` — relocate `PitchMovementSelector` block into the hitting fields section; restrict the existing bottom block to `isPitching` only; append `missed` to `contactOptions`.

## Verification

1. Start a hitting practice session → open rep logger → confirm the Movement Direction arrow grid appears under the pitch zone area on every hitting rep, in both Quick and Advanced modes, regardless of rep source.
2. Confirm the Contact Quality grid shows 7 options including the new "🚫 Missed" tile, and that selecting it commits a rep with `contact_quality: "missed"`.
3. Start a pitching session → confirm the Movement Direction selector still appears in its existing location at the bottom of the pitching fields (unchanged behavior).
