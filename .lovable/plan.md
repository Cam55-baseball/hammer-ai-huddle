
# Update Stripe Price IDs

Replace the 4 placeholder price IDs across 2 files with the real Stripe price IDs you provided.

## Price ID Mapping

| Tier | Sport | Price ID |
|------|-------|----------|
| 5Tool Player | Baseball | `price_1T3jzKGc5QIzbAH6deZ4Eyit` |
| 5Tool Player | Softball | `price_1T3jxwGc5QIzbAH65j6KlJzQ` |
| Golden 2Way | Baseball | `price_1T3jzxGc5QIzbAH6XoqPgC1b` |
| Golden 2Way | Softball | `price_1T3jycGc5QIzbAH62T36Iigg` |

## Files to Update

1. **`src/constants/tiers.ts`** -- Replace 4 `PENDING_*` placeholders with real price IDs
2. **`supabase/functions/create-checkout/index.ts`** -- Replace the same 4 `PENDING_*` placeholders

This is a straightforward find-and-replace across both files. No logic changes needed.
