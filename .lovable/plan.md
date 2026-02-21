

# Fix: 406 Error on user_roles API Calls in Profile Page

## Problem
The Profile page queries the `user_roles` table using `.single()`, which tells PostgREST to expect exactly one row. When the user has no role entry (common for regular players), PostgREST returns a **406 Not Acceptable** error.

## Root Cause
Two queries in `src/pages/Profile.tsx` use `.single()` instead of `.maybeSingle()`:

1. **Line 117** -- checking the current user's role in the follow-relationship effect
2. **Line 193** -- fetching the role for the profile being viewed

## Fix

**File: `src/pages/Profile.tsx`**

Change both `.single()` calls on `user_roles` queries to `.maybeSingle()`:

- Line 117: `.single()` to `.maybeSingle()`
- Line 193: `.single()` to `.maybeSingle()`

This is a two-line change. `.maybeSingle()` returns `null` data without an error when no row is found, which is the correct behavior since most players won't have an entry in `user_roles`.

## Impact
- Eliminates the 406 console errors on the Profile page
- No behavior change -- both call sites already handle `null` data gracefully with fallback values
