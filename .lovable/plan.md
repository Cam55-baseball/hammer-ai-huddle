

# Fix: Progress Report Locking, Checkout Glow Effect, and Post-Purchase Session Handling

## Issues Identified

### Issue 1: 6-Week Progress Tests and Photos Not Locking After Input (for Owner)

**Root Cause Analysis:**

Looking at the locking logic in `VaultPerformanceTestCard.tsx` (lines 258-265) and `VaultProgressPhotosCard.tsx` (lines 72-79):

```typescript
// VaultPerformanceTestCard.tsx
const latestTest = tests[0];
const latestTestDate = latestTest?.test_date ? new Date(latestTest.test_date) : null;
const unlockedByRecap = recapUnlockedAt && (!latestTestDate || latestTestDate < recapUnlockedAt);

const isLocked = !unlockedByRecap && latestTest?.next_entry_date && new Date(latestTest.next_entry_date) > new Date();
```

The **locking mechanism works correctly**. The issue is that **after the owner (Cam Williams) saves a performance test or progress photo, the data is not being refetched immediately** to update the UI with the new `next_entry_date`.

Checking `useVault.ts` lines 971-977:
```typescript
const { error } = await supabase.from('vault_performance_tests').insert({
  user_id: user.id, test_type: testType, sport: 'baseball', module: testType, 
  results: enhancedResults, previous_results: lastTest?.results || null,
  next_entry_date: nextEntryDate.toISOString().split('T')[0],
});
if (!error) await fetchPerformanceTests(); // This SHOULD refetch
```

The refetch is happening, but the **UI component receives the old array** until the state update propagates. The likely issue is that:

1. **After saving, the tests array in the component shows the OLD data** - the fetch happens but the component doesn't re-render with the new data containing `next_entry_date`
2. The `performanceTests` and `progressPhotos` arrays passed to the cards may be stale references

**Solution:** The refetch is working, but there's a timing issue. After a successful save, we need to ensure the parent component's state is updated and the cards receive the new data. The fix is to:
1. After save, explicitly refetch and update the local state
2. Use the latest fetched data that includes the `next_entry_date`

The actual fix requires examining why the UI doesn't show the locked state after save - it appears the card component needs to be forced to re-evaluate the `isLocked` condition after new data arrives.

---

### Issue 2: Make "Important" Message Glow on Checkout Page

**Current State:**
The amber message box at lines 322-326 of `Checkout.tsx`:
```tsx
<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
  <p className="text-sm text-amber-800 dark:text-amber-200">
    📌 <strong>Important:</strong> After purchasing your module click 'Back to dashboard' button or sign back in to access your new modules.
  </p>
</div>
```

**Solution:**
Add a persistent amber glow animation to the "Important" box using CSS keyframes. Create a new animation `glow-pulse-amber` in `App.css` and apply it.

---

### Issue 3: Users Logged Out After Purchase Completion

**Root Cause:**
Looking at `Checkout.tsx` lines 88-98:
```typescript
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
```

**The code explicitly redirects to `/auth` page** with a message telling users to "sign in". This is the bug - users are already logged in when they return from Stripe (they had to be logged in to start the checkout).

**Solution:**
After successful payment, redirect back to `/checkout` (the current page) or `/dashboard` instead of `/auth`. The user should remain logged in and see their new module activated.

---

## Implementation Plan

### File Changes

| File | Changes |
|------|---------|
| `src/pages/Checkout.tsx` | 1. Add amber glow animation class to "Important" box. 2. Change success redirect from `/auth` to `/dashboard` with success state. |
| `src/App.css` | Add `animate-glow-pulse-amber` keyframe animation |
| `src/components/vault/VaultPerformanceTestCard.tsx` | Force re-evaluation of lock state after data update |
| `src/components/vault/VaultProgressPhotosCard.tsx` | Same fix as above |

---

## Technical Implementation Details

### 1. Add Amber Glow Animation (App.css)

```css
@keyframes glow-pulse-amber {
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4);
  }
  50% { 
    box-shadow: 0 0 16px 6px rgba(251, 191, 36, 0.3);
  }
}

.animate-glow-pulse-amber {
  animation: glow-pulse-amber 2s ease-in-out infinite;
}
```

### 2. Apply Glow to Important Box (Checkout.tsx)

Update the amber message container:
```tsx
<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 animate-glow-pulse-amber">
```

### 3. Fix Post-Purchase Redirect (Checkout.tsx)

Change the success handling to redirect to dashboard instead of auth:
```typescript
if (status === 'success') {
  if (successHandledRef.current) return;
  successHandledRef.current = true;
  
  toast({
    title: "Payment Successful!",
    description: "Your new module is now active. Redirecting to dashboard...",
  });
  
  // Trigger subscription refetch
  refetch();
  
  // Redirect to dashboard (user stays logged in)
  navigate("/dashboard", { 
    replace: true,
    state: {
      fromPayment: true,
      newModule: selectedModule,
      sport: selectedSport
    }
  });
}
```

### 4. Fix Performance Test & Progress Photo Lock Display

The lock state calculation depends on `next_entry_date` from the latest entry. The issue is that after saving, the component uses the old `tests` array before the refetch completes.

**Solution:** Add a local "just saved" state that forces the locked view immediately after save:

In `VaultPerformanceTestCard.tsx`:
```typescript
const [justSaved, setJustSaved] = useState(false);

// When saving:
const handleSave = async () => {
  // ... existing save logic ...
  setSaving(true);
  const result = await onSave(selectedModule, results, handedness);
  if (result.success) {
    setJustSaved(true); // Immediately show as locked
  }
  setTestResults({});
  setSaving(false);
};

// Modified lock check:
const isLocked = justSaved || (!unlockedByRecap && latestTest?.next_entry_date && new Date(latestTest.next_entry_date) > new Date());
```

Same pattern for `VaultProgressPhotosCard.tsx`.

---

## Summary of Changes

| Issue | Fix | User Impact |
|-------|-----|-------------|
| Progress reports not locking | Add `justSaved` state flag that immediately shows locked state after save | Owner/users see cards locked immediately after submitting |
| Important text not glowing | Add amber glow animation CSS class | Visual emphasis on important post-purchase instructions |
| Logout after purchase | Change success redirect from `/auth` to `/dashboard` | Users stay logged in after Stripe payment |

