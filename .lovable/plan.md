
# Fix Owner/Admin Access Race Condition

## Problem Summary

Owners are incorrectly being told "You don't have access to this module. Please subscribe." because the access check runs BEFORE the owner/admin role queries complete.

### Evidence from Console Logs

```
AnalyzeVideo - Is Owner/Admin: false    ← Access check runs (too early!)
AnalyzeVideo - Has Access: false
...
[useOwnerAccess] Setting isOwner to: true  ← Query completes (too late!)
```

### Root Cause

In `AnalyzeVideo.tsx`, the component:
1. Gets `isOwner` and `isAdmin` from hooks BUT ignores their `loading` states
2. Waits for `authLoading`, `subLoading`, and `initialized`
3. Does NOT wait for `ownerLoading` or `adminLoading`
4. Checks access while role queries are still in-flight → owner check returns `false`

## Solution

Include the `loading` states from `useOwnerAccess` and `useAdminAccess` in the guard condition.

## Files to Update

| File | Change |
|------|--------|
| `src/pages/AnalyzeVideo.tsx` | Add `ownerLoading` and `adminLoading` to guard condition |
| `src/pages/Dashboard.tsx` | Same fix for consistency |

## Detailed Changes

### 1. Fix AnalyzeVideo.tsx

**Current code (lines 37-38):**
```typescript
const { isOwner } = useOwnerAccess();
const { isAdmin } = useAdminAccess();
```

**Updated:**
```typescript
const { isOwner, loading: ownerLoading } = useOwnerAccess();
const { isAdmin, loading: adminLoading } = useAdminAccess();
```

**Current guard (lines 159-162):**
```typescript
useEffect(() => {
  if (authLoading || subLoading || !initialized) {
    return;
  }
  // ... access check runs here
```

**Updated guard:**
```typescript
useEffect(() => {
  // Wait for all loading states before checking access
  if (authLoading || subLoading || !initialized || ownerLoading || adminLoading) {
    return;
  }
  // ... access check runs here
```

**Update dependency array (line 190):**
```typescript
}, [authLoading, subLoading, initialized, ownerLoading, adminLoading, user, subscribedModules, module, sport, isOwner, isAdmin, hasAccessForSport, navigate, t]);
```

### 2. Fix Dashboard.tsx

**Current code (lines 37-38):**
```typescript
const { isOwner } = useOwnerAccess();
const { isAdmin } = useAdminAccess();
```

**Updated:**
```typescript
const { isOwner, loading: ownerLoading } = useOwnerAccess();
const { isAdmin, loading: adminLoading } = useAdminAccess();
```

(Dashboard.tsx may need the same guard update if it has similar access checks)

## Why This Works

```text
Timeline BEFORE fix:
┌─────────────┬─────────────┬─────────────────────────┐
│ authLoading │ subLoading  │ ownerLoading/adminLoading │
│   Done      │    Done     │    Still loading...      │
└─────────────┴─────────────┴─────────────────────────┘
                     ↓
         Access check runs → isOwner = false → BLOCKED!
                     ↓
         Query finishes → isOwner = true (too late)

Timeline AFTER fix:
┌─────────────┬─────────────┬─────────────────────────┐
│ authLoading │ subLoading  │ ownerLoading/adminLoading │
│   Done      │    Done     │    Still loading...      │
└─────────────┴─────────────┴─────────────────────────┘
         Guard returns early (waits for all loaders)
                     ↓
┌─────────────┬─────────────┬─────────────────────────┐
│ authLoading │ subLoading  │ ownerLoading/adminLoading │
│   Done      │    Done     │        Done             │
└─────────────┴─────────────┴─────────────────────────┘
                     ↓
         Access check runs → isOwner = true → ACCESS GRANTED!
```

## Testing

After the fix, verify:
1. Owner can access all modules without subscribing
2. Admin can access all modules without subscribing  
3. Regular users still see subscription prompts for unpurchased modules
4. No flash of "no access" error during page load
