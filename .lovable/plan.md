# Price Normalization & Edit Price Workflow

## Current State
- Validation already accepts 0.5, 1, 49.9 (`priceValid = >= 0.5`).
- Edit-price dialog already exists in `BuildLibrary.tsx` (Pencil button → modal → `updateBuild`).
- Gap: prices are stored as raw `Number(price)` — `49.9` saves as `49.9`, not `49.90`. No 2-decimal normalization on save anywhere.
- Edit dialog still uses `type="number"` (spinner arrows + the same overlap issue we just fixed in the builders).

## Fix

### 1. Normalize to 2 decimals on every save
Add a helper inline in each save path:
```ts
const normalized = Math.round(priceNum * 100) / 100;
```
Store `normalized` (not `priceNum`) in `meta.price`.

Apply in:
- **`src/pages/owner/BundleBuilder.tsx`** — `handleSave`, both the saved meta and the toast.
- **`src/pages/owner/ProgramBuilder.tsx`** — `handleSave`, both the saved meta and the toast.
- **`src/pages/owner/BuildLibrary.tsx`** — `savePrice`, normalize before calling `updateBuild` and in the toast.

### 2. Polish the Edit Price input (BuildLibrary.tsx)
Match the builder fix:
- Switch `type="number"` → `type="text"` with `inputMode="decimal"`.
- Add regex-gated onChange: `/^\d*\.?\d{0,2}$/` (caps at 2 decimals as you type).
- Bump `pl-7` → `pl-8` so digits clear the `$`.
- Drop the `min`/`step` attributes (no longer applicable on text input).

### 3. Confirmed accepted values
With the above, the field accepts and stores:
- `0.5` → `0.50`
- `1` → `1.00`
- `49.9` → `49.90`
- `49.99` → `49.99`

Values below `$0.50` continue to block save with the existing inline error.

## Files Touched
- `src/pages/owner/BundleBuilder.tsx` (save normalization)
- `src/pages/owner/ProgramBuilder.tsx` (save normalization)
- `src/pages/owner/BuildLibrary.tsx` (save normalization + input polish)

No DB, schema, or storage-layer changes. `meta.price` remains a JS number — Stripe checkout already reads it as-is.
