
# Fix: Video Analysis Failure Due to Version Mismatch

## Problem Identified

Video analysis is failing for all users with this error in the edge function logs:
```
ZodError: frames - Required (expected: array, received: undefined)
```

**Root cause**: There's a version mismatch between the deployed components:
- **Edge function** (deployed): Now requires `frames` array as mandatory input
- **Frontend** (NOT deployed): Still running old code that doesn't send `frames`

This happened because:
1. Edge functions deploy automatically and independently
2. Frontend publishing has been failing repeatedly with "Publishing failed" errors
3. Production users are using the old frontend which doesn't include the frame extraction code

## Solution

Since the build is completing successfully (logs show "5116 modules transformed" and all chunks rendering), the publishing failure appears to be a transient platform issue. To resolve:

### Immediate Fix: Redeploy Edge Function

Make the `frames` field optional in the edge function schema to restore compatibility with the currently-deployed frontend while we resolve the publishing issue.

**File: `supabase/functions/analyze-video/index.ts`**

Change line 14 from:
```typescript
frames: z.array(z.string()).min(3, "At least 3 frames required for accurate analysis"),
```

To:
```typescript
frames: z.array(z.string()).min(3, "At least 3 frames required for accurate analysis").optional(),
```

Then add fallback logic in the handler to detect when frames aren't provided and return a user-friendly error message instead of a Zod validation crash.

### Handler Update

Add a check after schema validation:
```typescript
if (!validatedData.frames || validatedData.frames.length < 3) {
  return new Response(
    JSON.stringify({
      error: "Video analysis temporarily unavailable. Please try again in a few minutes.",
      code: "FRAMES_REQUIRED"
    }),
    { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

### Long-term: Resolve Publishing Issue

The publishing failure needs to be resolved so the frontend with frame extraction can be deployed. This appears to be a platform-level issue since:
- Build completes successfully
- No code errors are shown
- Failure happens immediately (before build processing)

## Technical Details

| Component | Status | Version |
|-----------|--------|---------|
| Edge Function | Deployed | Requires `frames` |
| Frontend (Preview) | Working | Sends `frames` |
| Frontend (Production) | Outdated | Does NOT send `frames` |

## Why This Fix Works

Making `frames` optional with a graceful fallback will:
1. Stop the Zod validation crash
2. Return a clear error message to users instead of a cryptic failure
3. Allow the system to function once publishing is resolved
4. Edge functions deploy automatically, so this fix will take effect immediately
