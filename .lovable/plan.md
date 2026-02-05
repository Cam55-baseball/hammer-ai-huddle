

## Overview

Two improvements to the Owner Dashboard for a seamless experience:

1. **Admin Status Reflection** - Users who are already admins should be clearly distinguished so the owner doesn't accidentally try to make them admin again (which causes a database error due to unique constraint)

2. **Return to Regular Dashboard** - Add navigation to return to the main app dashboard without logging out

---

## Current State Analysis

### Admin Status Issue
- The `isActiveAdmin()` function correctly identifies active admins (line 207-210)
- The UI already shows "Admin" badge + "Revoke" for active admins (lines 566-579)
- The "Make Admin" button only shows for non-admins (lines 581-589)
- **BUT**: The error occurs because there may be users with admin role in `pending` or `rejected` status who are NOT active admins, yet clicking "Make Admin" fails due to the unique constraint on `(user_id, role)`

### Missing Navigation
- Header only has "Sign Out" button (line 417)
- No way to return to `/dashboard` without logging out

---

## Solution

### 1. Fix Admin Detection Logic

The problem is that `isActiveAdmin()` only returns true for `status: 'active'`, but users can have an admin role entry with `pending` or `rejected` status. When the owner tries to "Make Admin", the INSERT fails due to unique constraint.

**Fix**: Check if user has ANY admin role entry (any status), not just active:

```typescript
// New helper function
const hasAdminRole = (userId: string) => {
  return userRoles.some((r) => r.user_id === userId && r.role === 'admin');
};
```

Then update the UI logic:
- If `isActiveAdmin()` → Show "Admin" badge + "Revoke" 
- Else if `hasAdminRole()` (pending/rejected) → Show status badge + action to reactivate or clear
- Else → Show "Make Admin" button

### 2. Add "Back to Dashboard" Navigation

Add a button in the header and sidebar to return to the main app:

**Header**: Add a "Back to App" link next to the logo
**Sidebar**: Add a "Return to Dashboard" item at the bottom

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/OwnerDashboard.tsx` | Add `hasAdminRole` helper, update UI logic, add navigation button |
| `src/components/owner/OwnerSidebar.tsx` | Add "Return to Dashboard" link at bottom |

---

## Technical Implementation

### 1. Enhanced Admin Detection (OwnerDashboard.tsx)

```typescript
// New helper - checks for any admin role entry (any status)
const hasAdminRole = (userId: string) => {
  return userRoles.some((r) => r.user_id === userId && r.role === 'admin');
};

// Get admin role status (active, pending, rejected)
const getAdminStatus = (userId: string) => {
  const role = userRoles.find((r) => r.user_id === userId && r.role === 'admin');
  return role?.status || null;
};
```

### 2. Updated User Management UI

```text
User Row States:
┌────────────────────────────────────────────────────────────────┐
│ Active Admin:                                                  │
│ [Avatar] John Doe                         [✓ Admin] [Revoke]   │
│          admin · Active · Joined Jan 1                         │
│          (green highlight)                                     │
├────────────────────────────────────────────────────────────────┤
│ Pending Admin (requested but not approved):                    │
│ [Avatar] Jane Doe                         [⏳ Pending] [Approve]│
│          admin · Pending · Joined Jan 2                        │
│          (yellow highlight)                                    │
├────────────────────────────────────────────────────────────────┤
│ Rejected Admin (was rejected):                                 │
│ [Avatar] Bob Smith                        [Reinstate Admin]    │
│          player · Rejected · Joined Jan 3                      │
│          (no highlight)                                        │
├────────────────────────────────────────────────────────────────┤
│ Regular User (never was admin):                                │
│ [Avatar] Alice User                       [Make Admin]         │
│          player · Joined Jan 4                                 │
│          (no highlight)                                        │
└────────────────────────────────────────────────────────────────┘
```

### 3. Handle Different Admin Statuses

```typescript
// For pending admins - show Approve/Reject inline
{getAdminStatus(user.id) === 'pending' && (
  <>
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
    <Button size="sm" onClick={() => handleApproveAdmin(user.id)}>
      Approve
    </Button>
    <Button size="sm" variant="ghost" onClick={() => handleRejectAdmin(user.id)}>
      Reject
    </Button>
  </>
)}

// For rejected admins - show option to reinstate
{getAdminStatus(user.id) === 'rejected' && (
  <>
    <Badge variant="outline" className="text-muted-foreground gap-1">
      <XCircle className="h-3 w-3" />
      Rejected
    </Badge>
    <Button size="sm" variant="outline" onClick={() => handleApproveAdmin(user.id)}>
      Reinstate
    </Button>
  </>
)}

// For users with no admin role at all
{!hasAdminRole(user.id) && (
  <Button size="sm" variant="outline" onClick={() => handleAssignRole(user.id, "admin")}>
    Make Admin
  </Button>
)}
```

### 4. Add "Return to Dashboard" Navigation

**In Header (OwnerDashboard.tsx):**
```typescript
<header className="h-14 border-b bg-card px-4 flex items-center justify-between shrink-0">
  <div className="flex items-center gap-3">
    {/* Mobile menu button */}
    
    {/* Logo and title */}
    <div className="flex items-center gap-2 min-w-0">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => navigate('/dashboard')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back</span>
      </Button>
      <div className="h-6 w-px bg-border hidden sm:block" />
      <div className="min-w-0">
        <h1 className="font-semibold text-sm md:text-base truncate">Owner Dashboard</h1>
      </div>
    </div>
  </div>
  
  <Button variant="outline" size="sm" onClick={handleSignOut}>
    Sign Out
  </Button>
</header>
```

**In Sidebar (OwnerSidebar.tsx):**
Add a "Return to Dashboard" link at the bottom of the sidebar, visually separated from the main navigation items.

---

## Visual Design

### Admin Status Indicators

| Status | Background | Badge | Actions |
|--------|------------|-------|---------|
| Active Admin | `bg-success/5` (green tint) | Green "Admin" with check | "Revoke" button |
| Pending Admin | `bg-amber-50` (yellow tint) | Amber "Pending" with clock | "Approve" / "Reject" buttons |
| Rejected Admin | None | Muted "Rejected" with X | "Reinstate" button |
| Regular User | None | None | "Make Admin" button |

### Back Navigation Button

- Position: Left side of header, before the logo/title
- Style: Ghost button with ArrowLeft icon
- Text: "Back" (hidden on mobile, just icon shown)
- Destination: `/dashboard`

---

## Sidebar Addition

Add a footer section to the sidebar with navigation back to the main app:

```typescript
// Bottom of sidebar, after the main navigation items
<div className="border-t p-3 mt-auto">
  <button
    onClick={() => navigate('/dashboard')}
    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
  >
    <ArrowLeft className="h-4 w-4 shrink-0" />
    <span className="flex-1 text-left">Return to App</span>
  </button>
</div>
```

---

## Edge Cases Handled

1. **User already has admin role (any status)**: UI shows appropriate status and actions, prevents duplicate INSERT errors
2. **Pending admin in Admin Requests vs User Management**: Both views allow approve/reject actions
3. **Mobile navigation**: Both header back button and sidebar drawer have return navigation
4. **Owner's own entry**: Should not show admin actions for the owner themselves (they're already owner)

---

## QA Checklist

1. **Admin Status Reflection**
   - Active admins show green badge + Revoke button
   - Pending admins show amber badge + Approve/Reject buttons
   - Rejected admins show muted badge + Reinstate button
   - Regular users show Make Admin button
   - No duplicate INSERT errors when clicking buttons

2. **Navigation**
   - "Back" button in header returns to /dashboard
   - "Return to App" in sidebar returns to /dashboard
   - Mobile: Back button visible in header
   - Mobile: Return to App visible in sidebar drawer

3. **No Regressions**
   - All existing functionality still works
   - Admin requests section still shows pending requests
   - Approve/Reject/Revoke still function correctly

