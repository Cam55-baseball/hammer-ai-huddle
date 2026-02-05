

## Overview
Lock the Real-Time Playback feature for all users **except owners and admins**. Regular users will see an "Under Construction" message instead of the feature. Owners and admins can continue to access it for testing and development.

---

## Current State

The `RealTimePlaybackCard` component is used in `AnalyzeVideo.tsx` (line 569) and displays for all users who have access to the analyze page. There is no role-based gating on this feature.

The project already has:
- `useOwnerAccess` hook → returns `{ isOwner, loading }`
- `useAdminAccess` hook → returns `{ isAdmin, loading }`
- "Under Construction" UI pattern used in `ComingSoon.tsx` and `Index.tsx`
- Translation keys for construction messages in `en.json`

---

## Solution

Modify `RealTimePlaybackCard.tsx` to:
1. Import and use `useOwnerAccess` and `useAdminAccess` hooks
2. Show a loading skeleton while checking roles
3. If user is **owner OR admin** → show the full Real-Time Playback feature
4. If user is **neither** → show an "Under Construction" card with a friendly message

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/RealTimePlaybackCard.tsx` | Add role checks and conditional rendering |
| `src/i18n/locales/en.json` | Add translation key for the locked feature message |

---

## Technical Details

### RealTimePlaybackCard.tsx Changes

```text
Current flow:
  User clicks → Opens RealTimePlayback dialog

New flow:
  Check isOwner OR isAdmin
    ├─ Yes → Show full feature (current behavior)
    └─ No → Show "Under Construction" card
```

The component will:
1. Import hooks: `useOwnerAccess`, `useAdminAccess`
2. Import icons: `Construction`, `Sparkles`
3. Wait for both loading states before rendering
4. Conditionally render based on role

### Under Construction Card Design
Following the existing pattern from `ComingSoon.tsx`:
- Red/orange construction styling
- `Construction` icon with pulse animation
- Clear messaging: "Real-Time Playback is under development"
- "We're polishing this feature for the best training experience"
- "Active Development" indicator

### Translation Keys to Add
```json
{
  "realTimePlayback": {
    "underConstruction": "Under Construction",
    "underConstructionTitle": "Real-Time Playback Coming Soon!",
    "underConstructionDescription": "We're polishing this feature for the best training experience. Stay tuned!",
    "activeDevelopment": "Active Development"
  }
}
```

---

## Access Control Logic

```typescript
const { isOwner, loading: ownerLoading } = useOwnerAccess();
const { isAdmin, loading: adminLoading } = useAdminAccess();

// Wait for role checks to complete
if (ownerLoading || adminLoading) {
  return <LoadingSkeleton />;
}

// Only owners and admins can access
const hasAccess = isOwner || isAdmin;

if (!hasAccess) {
  return <UnderConstructionCard />;
}

// Show full feature
return <FullRealTimePlaybackCard />;
```

---

## Security Considerations

- Role verification happens via `user_roles` table with `status = 'active'` check
- Both hooks use server-side Supabase queries (not localStorage)
- Loading states prevent flash of unauthorized content

---

## QA Checklist

1. Log in as **owner** → Real-Time Playback card should be fully functional
2. Log in as **admin** → Real-Time Playback card should be fully functional  
3. Log in as **regular user** → Should see "Under Construction" card instead
4. Log out → Real-Time Playback should not appear (parent page likely redirects anyway)
5. Check loading state → Brief skeleton while roles are checked, no flash of wrong content

