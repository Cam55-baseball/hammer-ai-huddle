

# Fix: Preview Authentication — Module Import Failure

## Root Cause

`src/pages/Auth.tsx` line 89 uses a **dynamic import** after sign-in:
```typescript
const { supabase } = await import("@/integrations/supabase/client");
```

In the preview environment, dynamic imports go through a proxy that can intermittently fail, producing the "Importing a module script failed" error. This kills the entire post-login flow (onboarding checks, navigation).

The supabase client is already a static module used everywhere else in the app. There is no reason to dynamically import it here.

## Fix

**File: `src/pages/Auth.tsx`**

1. Add static import at the top of the file:
```typescript
import { supabase } from "@/integrations/supabase/client";
```

2. Remove the dynamic import on line 89:
```typescript
// DELETE: const { supabase } = await import("@/integrations/supabase/client");
```

The rest of the sign-in logic (the `Promise.all` with profile/subscription/role checks) remains unchanged — it just uses the already-imported `supabase` client directly.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Replace dynamic `await import()` with static import of supabase client |

## Impact
- Eliminates the "Importing a module script failed" error in preview
- Sign-in flow works end-to-end in both preview and production
- Zero behavioral change — same queries, same routing logic

