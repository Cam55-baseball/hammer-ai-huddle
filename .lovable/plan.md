

# Fix Flickering Toast Messages After Payment Success

## Problem Identified

When users return from Stripe checkout with `?status=success`, the toast notifications ("Payment Successful!" / "Verifying your session...") flicker repeatedly because:

### Root Cause Analysis

```text
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT BROKEN FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User returns from Stripe with ?status=success                  │
│                         │                                       │
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  useEffect runs (status === 'success')               │      │
│  │  → toast("Payment Successful! Verifying...")         │      │
│  │  → Creates setInterval(200ms)                        │      │
│  └──────────────────────────────────────────────────────┘      │
│                         │                                       │
│     Dependencies change (user/session update)                   │
│                         │                                       │
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  useEffect runs AGAIN (same status === 'success')    │      │
│  │  → toast("Payment Successful! Verifying...") AGAIN   │◀─┐  │
│  │  → Creates ANOTHER setInterval(200ms)                │  │  │
│  └──────────────────────────────────────────────────────┘  │  │
│                         │                                  │  │
│     Dependencies change again...                           │  │
│                         └──────────────────────────────────┘  │
│                                                                 │
│  Result: Multiple overlapping intervals, repeated toasts        │
│          causing flickering UI                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Specific Issues:

| Issue | Location | Problem |
|-------|----------|---------|
| 1. No guard for success handling | Line 61-149 | Each useEffect re-run triggers a new toast + interval |
| 2. Stale closure in interval | Line 74-146 | `user` and `session` are captured at creation, but interval checks them each tick |
| 3. `toast` in dependency array | Line 160 | Can trigger unnecessary re-runs |
| 4. Multiple toasts without ID tracking | Lines 65-68, 82-85, 118-121 | Each toast is a new instance, causing visual flickering |

---

## Solution

Add a **`useRef` guard** to ensure the success flow only executes once, regardless of how many times the useEffect re-runs.

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/Checkout.tsx` | Add success-handled ref, show single toast, remove interval polling |

---

## Technical Implementation

### 1. Add Success-Handled Ref Guard

```typescript
// Add near other refs (line 32)
const successHandledRef = useRef(false);
```

### 2. Simplify Success Flow (Remove Interval Polling)

**Before:** Complex interval polling with multiple toast calls
**After:** Single toast, immediate redirect

```typescript
if (status === 'success') {
  // Guard: Only handle success once
  if (successHandledRef.current) {
    return;
  }
  successHandledRef.current = true;
  
  console.log('Checkout: Payment successful, redirecting...');
  
  // Single toast notification
  toast({
    title: "Payment Successful!",
    description: "Redirecting to sign in...",
  });
  
  // Store pending module activation
  if (isAddMode && selectedModule && selectedSport) {
    localStorage.setItem('pendingModuleActivation', JSON.stringify({
      module: selectedModule,
      sport: selectedSport,
      timestamp: Date.now()
    }));
  }
  
  // Trigger subscription refetch
  refetch();
  
  // Redirect immediately (no polling needed)
  navigate("/auth", { 
    replace: true,
    state: {
      fromPayment: true,
      message: "Payment successful! Please sign in to access your new module.",
      module: selectedModule,
      sport: selectedSport
    }
  });
  
  return;
}
```

### 3. Remove Problematic Dependencies

Remove `toast` from dependency array to prevent unnecessary re-runs:

```typescript
}, [authLoading, ownerLoading, adminLoading, user, navigate, searchParams, refetch, isAddMode]);
// Note: removed 'toast' - it's stable and doesn't need to trigger re-runs
```

---

## Why Polling is Unnecessary

The original code polled for `user && session` to be truthy, but:

1. **User is already authenticated** when returning from Stripe (they logged in before checkout)
2. **The redirect to `/auth` page** will handle any session edge cases
3. **Webhook processing** happens independently of this flow

Removing the interval eliminates the source of flickering entirely.

---

## Expected Behavior After Fix

1. User returns from Stripe with `?status=success`
2. **Single toast** appears: "Payment Successful! Redirecting to sign in..."
3. **Immediate redirect** to `/auth` page with success state
4. No flickering, no repeated toasts

