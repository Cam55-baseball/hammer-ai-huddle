## Goal
Make the "Unlock Now" CTA on the three module cards (Complete Pitcher, 5Tool Player, Golden 2Way) on the Dashboard impossible to miss, while clearly differentiating it from the calm "Start Training" state shown after a user has already paid for that module.

## Visual direction

**Locked / Unlock Now (high-energy, conversion CTA)**
- Vivid gradient fill using existing brand tokens: `bg-gradient-to-r from-primary via-amber-500 to-primary` (HSL/semantic — primary is the brand red).
- White (`text-primary-foreground`) bold uppercase label with slight letter-spacing.
- Glow shadow (`shadow-[0_0_24px_hsl(var(--primary)/0.45)]`) plus `hover:shadow-[0_0_32px_hsl(var(--primary)/0.6)]`.
- Subtle infinite pulse on the icon (`animate-pulse` on the leading `Sparkles`) and a one-time `motion-safe:animate-[shimmer_3s_ease-in-out_infinite]` sheen.
- Slightly taller (`h-12`), full-width, label "Unlock Now — $X/mo" so users instantly see price + action.
- Card itself keeps the dashed primary border to read as "available to buy".

**Unlocked / Start Training (calm, post-purchase)**
- Quiet treatment: `variant="outline"` with `border-primary/40`, no gradient, no glow, no pulse.
- Small green check chip ("Unlocked") on the card so the paid state is unmistakable.
- Card border switches to solid `border-primary/40` (already in code) — keep as-is.

This reverses the current contrast (today the unlocked state uses `default` solid red while locked uses `outline`, which makes paid look more urgent than buy — exactly the confusion users reported).

## Implementation

Single file: `src/pages/Dashboard.tsx`, lines ~385–488.

1. Extract a small inline helper at the top of the modules section:
   ```tsx
   const unlockBtnClass = "h-12 w-full font-bold uppercase tracking-wide text-primary-foreground bg-gradient-to-r from-primary via-amber-500 to-primary bg-[length:200%_100%] animate-[shimmer_3s_linear_infinite] shadow-[0_0_24px_hsl(var(--primary)/0.45)] hover:shadow-[0_0_32px_hsl(var(--primary)/0.6)] hover:scale-[1.03] transition-all";
   const startedBtnClass = "h-11 w-full border-primary/40 text-foreground hover:bg-primary/5";
   ```
2. For each of the 3 module cards, replace the existing `<Button variant=…>` block with conditional rendering:
   - If `isTierUnlocked(tier)` → `<Button variant="outline" className={startedBtnClass}>` with `Start Training` + tier icon.
   - Else → `<Button className={unlockBtnClass}>` with `<Sparkles className="animate-pulse" />` + `Unlock Now — $${TIER_CONFIG[tier].price}/mo`.
3. For the unlocked state only, add a small badge above the title:
   ```tsx
   <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-[10px]">
     <Check className="h-3 w-3 mr-1" /> Unlocked
   </Badge>
   ```
   (Keeps the existing "Most Popular" / "Best Value" badges; this one only renders when paid.)
4. Add a `shimmer` keyframe to `tailwind.config.ts` (or `index.css` as `@keyframes`) — `0% { background-position: 0% 0 } 100% { background-position: 200% 0 }` — so the gradient subtly travels. If a shimmer keyframe already exists, reuse it.
5. Pull pricing from the existing `TIER_CONFIG` (already imported in `src/constants/tiers.ts`) so the price stays in sync with `Pricing.tsx`.
6. Update i18n `dashboard.unlockModule` value from "Unlock Now" → keep key, but the rendered string becomes `"Unlock Now — ${price}/mo"` constructed in the component (no translation churn beyond the existing key).

## Out of scope
- No changes to the `/pricing` flow, checkout, entitlement logic, or `isTierUnlocked`.
- No changes to other CTAs (merch card, header, etc.).
- No new routes or backend work.

## Files touched
- `src/pages/Dashboard.tsx` (button + badge markup for the 3 module cards)
- `tailwind.config.ts` or `src/index.css` (add `shimmer` keyframe if missing)
