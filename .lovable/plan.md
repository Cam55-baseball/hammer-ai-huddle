

## Answer — What "Estimated" means on your goat milk log

**It's an honest data-source flag, not an error.**

Looking at `HydrationLogCard.tsx`, the red/primary "Estimated" pill renders when the log row has `ai_estimated = true`:

```tsx
{(log as any).ai_estimated && (
  <span className="...bg-primary/10 text-primary...">Estimated</span>
)}
{(log as any).nutrition_incomplete && (
  <span className="...bg-warning/15 text-warning...">Partial data</span>
)}
```

### Why your goat milk got tagged

Goat milk hits one of two paths in `useHydration.ts`:

1. **Preset path** — if it's in `hydration_beverage_database` with complete USDA micros, no flag.
2. **AI/fallback path** — if Hammer had to estimate values (freeform name, missing preset, or a category-fallback was applied to fill required micros like zinc), the row is saved with `ai_estimated = true`.

Given the recent self-healing work we added: if your goat milk preset row was missing required dairy micros (Ca/K/Mg/**Zn**), the client applied USDA-grounded fallback minimums and flagged the row as estimated. That's the system being transparent — "these numbers are accurate enough to score you, but they came from category defaults, not a per-brand lab analysis."

### What it does NOT mean
- Not "wrong data" — values are USDA-grounded
- Not "low confidence" — that would be the amber **"Partial data"** pill (`nutrition_incomplete`)
- Not blocking your hydration score — score still computes normally

### Two flags, two meanings

| Pill | Color | Trigger | Meaning |
|---|---|---|---|
| Estimated | primary (red-ish) | `ai_estimated = true` | Values came from Hammer/category fallbacks, not a verified preset |
| Partial data | amber | `nutrition_incomplete = true` | Some required fields couldn't be resolved even after fallback |

### If you'd like, I can:
1. **Tone down the color** — switch "Estimated" from primary/red to a neutral muted pill so it reads as info, not warning.
2. **Add a tooltip** explaining the source (e.g. "USDA-based estimate for dairy category") on hover.
3. **Suppress the flag** when the only reason it fired was a category fallback on a *preset* row (since that's now self-healed in DB) — only show it for true freeform AI logs.

No code changes needed unless you want one of the above.

