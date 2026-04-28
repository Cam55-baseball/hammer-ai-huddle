Darken the borders on the Quick Actions block.

**File:** `src/components/identity/QuickActionsCard.tsx`

- Outer card wrapper (line 25): `border` → `border-2 border-zinc-900`.
- Inner content frame (line 49): `border border-border/60` → `border-2 border-zinc-900`.
- `<HammerStateBadge />` (line 51): pass `className="border-2 border-zinc-900"` (the badge already merges `className` onto its outer pill).
- `<ReadinessChip />` (line 52): pass `className="border-2 border-zinc-900"` (chip merges `className` onto the compact pill).
- "Open Recovery" / next-action outline button (line 71): append `border-2 border-zinc-900` to its className.

Leave the primary "Log" button and the "Next up" text block untouched.

Result: dark, defined outlines around the Quick Actions card, the inner frame, the Recover (Hammer state) pill, the Readiness pill, and the Open Recovery button. No token/theme changes; localized to this card.
