

# Fix: Add Missing Stripe Product Metadata

## Root Cause
The Stripe webhook cannot recognize the new tier products because they are missing required metadata fields (`tier` and `sport`). Without these, the webhook's tier detection logic (lines 180-181 of `stripe-webhook/index.ts`) fails silently and the subscription is never written to the database.

## The Fix

This is a Stripe-side configuration fix, not a code change. We need to update 4 Stripe products with the correct metadata:

| Product | Product ID | Metadata to Add |
|---------|------------|-----------------|
| Baseball 5Tool Player | `prod_U1naxz89S1XaTu` | `tier: 5tool`, `sport: baseball` |
| Softball 5Tool Player | *(need to look up)* | `tier: 5tool`, `sport: softball` |
| Baseball Golden 2Way | `prod_U1nbhDT9XDGPY3` | `tier: golden2way`, `sport: baseball` |
| Softball Golden 2Way | *(need to look up)* | `tier: golden2way`, `sport: softball` |

Since we cannot update Stripe product metadata directly from here, we have two options:

### Option A -- Add metadata via Stripe Dashboard (recommended)
You would need to go to your Stripe Dashboard, find each product, and add the `tier` and `sport` metadata keys manually.

### Option B -- Make the webhook smarter (code fix)
Update the webhook to infer tier and sport from the **product name** (e.g., "Baseball Golden 2Way" -> tier=golden2way, sport=baseball) as a fallback when metadata is missing. This is more resilient and doesn't require manual Stripe configuration.

## Recommended Approach: Option B

Update `supabase/functions/stripe-webhook/index.ts` to add name-based tier detection as a fallback after the metadata check:

```
// After checking product.metadata?.tier (line 180):
// If no tier from metadata, infer from product name
if (!tier) {
  const name = product.name.toLowerCase();
  if (name.includes('golden 2way') || name.includes('golden2way')) tier = 'golden2way';
  else if (name.includes('5tool')) tier = '5tool';
  else if (name.includes('pitcher') || name.includes('complete pitcher')) tier = 'pitcher';
}
```

This ensures the webhook works regardless of whether product metadata is configured, making the system more robust.

## After the Fix

The user's existing subscription from Stripe will be recognized on the next webhook event or the next time they trigger a subscription check. To immediately unlock the module for the user who already purchased, we can also manually update their `subscriptions` row in the database.

## Technical Details

**File to update:** `supabase/functions/stripe-webhook/index.ts` (lines 179-207)
- Add name-based tier/sport inference as fallback after metadata check
- No other files need changes -- the rest of the system already handles tier keys correctly

