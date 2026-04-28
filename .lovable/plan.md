## Issue
The text the user calls out ("Identity", "Day intent", "Today's standard", "You're being held to the X standard today. Tap Confirm to lock in that you're operating at it.", "Operate at your current identity standard", etc.) lives in `src/components/identity/IdentityCommandCard.tsx` (the expanded panel of the Identity card above the Game Plan). All of it currently uses `text-muted-foreground`, which renders as washed-out gray on the dark tier gradient.

Pure black text on the existing dark gradient would be invisible. To make it actually black and readable, the **expanded panel surface** must become a light/white background. The collapsed header keeps the bold tier gradient (so the identity tier still pops), but the moment the card expands, the readable section flips to a high-contrast surface with black text.

## Changes — `src/components/identity/IdentityCommandCard.tsx`

1. **Expanded panel surface → white**
   - In `<CollapsibleContent>`, wrap the inner `<div className="px-3 sm:px-4 pb-4 pt-1 space-y-4 border-t border-border/40">` with `bg-white text-neutral-900` so all content beneath the header sits on white with black default text.

2. **All gray labels → black**
   - `SectionHeader` `<h4>`: `text-muted-foreground` → `text-neutral-900`.
   - `SectionHeader` info button: `text-muted-foreground/60 hover:text-foreground` → `text-neutral-700 hover:text-neutral-900`.
   - "Today's Standard" body paragraph (`text-xs text-muted-foreground leading-relaxed`) → `text-xs text-neutral-900 leading-relaxed`. The tier word inside it keeps its colored `tone` class.
   - Day intent explanation paragraph (`text-xs text-muted-foreground leading-relaxed`) → `text-xs text-neutral-900 leading-relaxed`.
   - Rest budget chip surface: `bg-background/40 border-border/60` → `bg-neutral-100 border-neutral-300`, and the in-budget label gets `text-neutral-900`.
   - Quick Actions container: `bg-background/30 border-border/60` → `bg-neutral-100 border-neutral-300`.
   - "Next up" eyebrow + label: `text-muted-foreground` → `text-neutral-900`; main label uses `text-neutral-900 hover:text-primary`.

3. **Collapsed header (kept as-is, dark gradient)**
   - The header row, tier label, score, and streak chips at the top stay on the dark gradient. Those already use bumped contrast from the previous pass (`text-foreground/80`, white tier tones). No change there.

4. **Tooltip content**
   - `TooltipContent` (white-on-dark by default) is fine; no change.

## Files touched
- `src/components/identity/IdentityCommandCard.tsx`

## Out of scope
- `IdentityBanner.tsx` — already updated previously and not the source of the gray text.
- Behavior, state, or layout — purely visual contrast changes.
