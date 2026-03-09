

# Add Even/Odd Signal Option to Baseball Pick-Off Trainer

## What Changes

Add a "Signal Type" selection (Standard Color vs Even/Odd) to the pickoff trainer setup, mirroring the softball stealing trainer's implementation. When Even/Odd is selected, the signal window shows random numbers instead of colors: Even = Pitch, Odd = Pick-Off.

## Files to Edit

### 1. `src/components/pickoff-trainer/PickoffSetup.tsx`
- Add `signalType` state (`'color' | 'even_odd'`, default `'color'`)
- Add a RadioGroup card for signal type selection (same pattern as `SoftballStealSetup.tsx`)
- Show explanation when even/odd is selected: "Even = Pitch, Odd = Pick-Off"
- Update Signal Guide card to reflect the selected mode
- Change `onStart` signature to pass `signalType` as a third parameter

### 2. `src/components/pickoff-trainer/PickoffRepRunner.tsx`
- Accept `signalType` prop
- Add `EVEN_NUMBERS` and `ODD_NUMBERS` arrays (same as softball)
- In `signal_window` phase: when `even_odd` mode, show random numbers as fake signals instead of color flashes
- In `real_signal` phase: when `even_odd` mode, show the even/odd number instead of green/red background
- In `decision` phase: show the number that was displayed alongside its meaning

### 3. `src/pages/PickoffTrainer.tsx`
- Add `signalType` state
- Update `handleStart` to accept and store signal type
- Pass `signalType` to `PickoffRepRunner`
- Include `signal_type` in `micro_layer_data` and session notes

