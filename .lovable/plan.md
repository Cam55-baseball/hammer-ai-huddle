## Changes

**1. `src/pages/Dashboard.tsx` (line 436)**
Change locked CTA label from `Unlock Now{price ? ` — $${price}/mo` : ''}` to just `Unlock Now!`. Remove the now-unused `price`/`TIER_CONFIG` reference if only used for that string.

**2. `src/pages/Auth.tsx` (lines 317–332)**
Make the sign-up toggle far more prominent on the login view:
- Wrap in a divider block ("New to Hammers?") with a top border + label.
- Replace the muted text button with a full-width `Button` (`variant="outline"`, `size="lg"`) using primary border/text and a subtle primary tint (`border-primary/60 text-primary hover:bg-primary/10`), with a `UserPlus` icon.
- Keep the same toggle behavior; only the login→signup state gets the prominent button. The "already have an account" and "back to sign in" states keep the smaller text link styling.

No backend, i18n, or routing changes. Pure presentation.