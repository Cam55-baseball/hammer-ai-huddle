

## Overview

Two major improvements to the Owner Dashboard:

1. **Add a dedicated sidebar navigation** - Create a persistent sidebar for the Owner Dashboard with scrollable sections for all management features (User Management, Admin Requests, Scout Applications, Recent Videos, Subscriptions, Settings, Player Profile Search)

2. **Improve admin appointment UI** - Enhance the visual feedback when making users admins, showing clear "Admin" status with undo capability

---

## Current State Analysis

### Owner Dashboard Navigation
- **Current**: Uses horizontal `TabsList` with 7 tabs that don't scroll well on mobile
- **Location**: `src/pages/OwnerDashboard.tsx` (lines 414-427)
- **Problem**: Tabs overflow on smaller screens, no visual hierarchy, hard to navigate

### Admin Appointment
- **Current**: "Make Admin" button changes to "Remove Admin" when user is admin (lines 455-472)
- **Has**: `isActiveAdmin()` helper function and "Active Admin" badge display
- **Missing**: Visual confirmation/transition, clear "undo" capability communication

---

## Solution 1: Owner Dashboard Sidebar

### Approach
Create a dedicated `OwnerSidebar` component that provides:
- Vertical scrollable navigation for all dashboard sections
- Active state highlighting for current section
- Mobile-friendly collapsible drawer
- Badge counts for pending items (Admin Requests, Scout Applications)

### Architecture

```text
OwnerDashboard.tsx
├── OwnerSidebarProvider (new wrapper)
│   ├── OwnerSidebar (new component)
│   │   ├── Overview (Analytics)
│   │   ├── User Management
│   │   ├── Admin Requests (with count badge)
│   │   ├── Scout Applications (with count badge)
│   │   ├── Recent Videos
│   │   ├── Subscriptions
│   │   ├── Settings
│   │   └── Player Profile Search
│   └── Main Content Area
└── Content renders based on activeSection state
```

### Navigation Items
| Section | Icon | Badge |
|---------|------|-------|
| Overview | LayoutDashboard | - |
| User Management | Users | - |
| Admin Requests | UserCog | Pending count |
| Scout Applications | UserPlus | Pending count |
| Recent Videos | Video | - |
| Subscriptions | CreditCard | - |
| Settings | Settings | - |
| Player Search | Search | - |

### Files to Create/Modify
| File | Action |
|------|--------|
| `src/components/owner/OwnerSidebar.tsx` | Create new sidebar component |
| `src/pages/OwnerDashboard.tsx` | Replace Tabs with sidebar-based navigation |

---

## Solution 2: Admin Appointment UI Enhancement

### Current Flow
1. User clicks "Make Admin" → admin role inserted with `status: 'active'`
2. Button changes to "Remove Admin"
3. Small "Active Admin" badge appears in role text

### Enhanced Flow
1. User clicks "Make Admin"
2. Button transforms with animation to show shield icon + "Admin" label
3. Clear "Revoke" button appears for undo
4. Row gets subtle green highlight to indicate admin status
5. Badge with checkmark icon clearly shows admin status

### UI Changes

**Before (non-admin):**
```text
┌─────────────────────────────────────────────────────┐
│ John Doe                              [Make Admin]  │
│ Role: player                                        │
│ Joined: Jan 1, 2024                                 │
└─────────────────────────────────────────────────────┘
```

**After (admin appointed):**
```text
┌─────────────────────────────────────────────────────┐
│ John Doe                    [✓ Admin] [Revoke]      │
│ Role: admin  🛡️ Active Admin                        │
│ Joined: Jan 1, 2024                                 │
└─────────────────────────────────────────────────────┘
```

### Visual Indicators
- **Admin Badge**: Green badge with `ShieldCheck` icon and "Admin" text
- **Row Highlight**: Subtle green-tinted background for admin rows
- **Revoke Button**: Destructive variant with "Revoke Admin" text
- **Status Badge**: Enhanced with icon and pulsing animation on recent change

---

## Technical Details

### OwnerSidebar Component Structure

```typescript
// src/components/owner/OwnerSidebar.tsx
interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badgeCount?: number;
}

const sidebarItems: SidebarItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'admin-requests', label: 'Admin Requests', icon: UserCog },
  { id: 'scout-applications', label: 'Scout Applications', icon: UserPlus },
  { id: 'videos', label: 'Recent Videos', icon: Video },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'player-search', label: 'Player Search', icon: Search },
];
```

### Admin Button State Logic

```typescript
// Enhanced admin button rendering
{isActiveAdmin(user.id) ? (
  <div className="flex items-center gap-2">
    <Badge variant="default" className="bg-green-600 gap-1">
      <ShieldCheck className="h-3 w-3" />
      Admin
    </Badge>
    <Button
      size="sm"
      variant="outline"
      className="text-destructive border-destructive/50 hover:bg-destructive/10"
      onClick={() => handleRemoveAdmin(user.id)}
    >
      Revoke
    </Button>
  </div>
) : (
  <Button size="sm" variant="outline" onClick={() => handleAssignRole(user.id, "admin")}>
    Make Admin
  </Button>
)}
```

### Row Styling for Admins

```typescript
<div className={cn(
  "p-4 border rounded-lg transition-colors flex justify-between items-center",
  isActiveAdmin(user.id) 
    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/30" 
    : "hover:bg-muted/50"
)}>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/owner/OwnerSidebar.tsx` | **Create** - New sidebar navigation component |
| `src/pages/OwnerDashboard.tsx` | Replace Tabs with sidebar layout; enhance admin buttons |
| `src/i18n/locales/en.json` | Add translation keys for sidebar items |

---

## Translation Keys to Add

```json
{
  "ownerDashboard": {
    "sidebar": {
      "overview": "Overview",
      "userManagement": "User Management",
      "adminRequests": "Admin Requests",
      "scoutApplications": "Scout Applications",
      "recentVideos": "Recent Videos",
      "subscriptions": "Subscriptions",
      "settings": "Settings",
      "playerSearch": "Player Search"
    },
    "admin": {
      "badge": "Admin",
      "revoke": "Revoke",
      "appointed": "Admin privileges granted",
      "revoked": "Admin privileges revoked"
    }
  }
}
```

---

## Mobile Considerations

- Sidebar collapses to a drawer/sheet on mobile (using existing `Sheet` component)
- Touch-friendly navigation items with adequate tap targets
- Hamburger menu trigger in mobile header
- Badge counts visible in both collapsed and expanded states

---

## QA Checklist

1. **Sidebar Navigation**
   - Open Owner Dashboard → verify sidebar appears on left
   - Click each sidebar item → verify content updates correctly
   - Check mobile view → verify sidebar collapses to drawer
   - Verify badge counts show for Admin Requests and Scout Applications

2. **Admin Appointment**
   - Find a non-admin user → click "Make Admin" → verify:
     - Button changes to show shield icon + "Admin" badge
     - "Revoke" button appears
     - Row gets green highlight
     - Toast confirms action
   - Click "Revoke" → verify:
     - User returns to normal state
     - "Make Admin" button reappears
     - Toast confirms revocation

3. **Database Verification**
   - After making admin → check `user_roles` table for `status: 'active'`
   - After revoking → verify role is deleted from table

