

## Overview

Fix the duplicate navigation issue on the Owner Dashboard and create a clean, professional, polished UI across all sections. The current implementation has confusing navigation with multiple menu buttons and inconsistent styling.

---

## Problems Identified

### 1. Duplicate Navigation (Critical)
| Issue | Location | Problem |
|-------|----------|---------|
| AppSidebar + Menu button | `DashboardLayout.tsx` | Main app navigation always present |
| Desktop OwnerSidebar | `OwnerDashboard.tsx` line 373-378 | Second navigation system |
| Mobile OwnerSidebar | `OwnerDashboard.tsx` line 383-392 | **Third** menu button rendered |

Result: Users see 2-3 menu buttons on screen simultaneously.

### 2. Messy UI Issues
- Inconsistent card padding and spacing
- No unified header design for sections
- Cramped list items in User Management
- Player Search section lacks visual hierarchy
- Admin Request cards too basic
- Mobile layout has competing headers

---

## Solution

### Architecture: Single Owner Sidebar (Remove DashboardLayout wrapper)

The Owner Dashboard should **not** use `DashboardLayout` since it has its own navigation needs. Instead, create a dedicated layout:

```text
OwnerDashboard (NO DashboardLayout wrapper)
├── OwnerHeader (new - minimal, clean)
├── OwnerSidebar (single instance - desktop fixed, mobile sheet)
└── Main Content (polished sections)
```

### Key Changes

1. **Remove DashboardLayout wrapper** - Owner Dashboard gets its own layout
2. **Single OwnerSidebar instance** - Handle mobile/desktop internally
3. **Clean header with sign out and page title only**
4. **Polished card components** - Consistent spacing, better hierarchy
5. **Professional list items** - Better user cards, admin cards, etc.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/OwnerDashboard.tsx` | Remove DashboardLayout, fix sidebar rendering, polish all sections |
| `src/components/owner/OwnerSidebar.tsx` | Fix to render only once with internal mobile/desktop logic |

---

## Technical Details

### 1. Remove DashboardLayout Wrapper

```typescript
// BEFORE
return (
  <DashboardLayout>
    <div className="flex min-h-[calc(100vh-4rem)]">
      <OwnerSidebar ... />
      ...
    </div>
  </DashboardLayout>
);

// AFTER
return (
  <div className="flex min-h-screen bg-background">
    <OwnerSidebar ... />
    <main className="flex-1 flex flex-col overflow-hidden">
      <OwnerHeader />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Content */}
      </div>
    </main>
  </div>
);
```

### 2. Fix OwnerSidebar - Single Render with Mobile Detection

The sidebar will handle its own mobile/desktop rendering internally. Remove the duplicate mobile block in OwnerDashboard.

```typescript
// OwnerDashboard.tsx - SINGLE sidebar render
<OwnerSidebar
  activeSection={activeSection}
  onSectionChange={setActiveSection}
  pendingAdminRequests={adminRequests.length}
  pendingScoutApplications={scoutApplications.filter(a => a.status === 'pending').length}
/>
```

### 3. Create OwnerHeader Component

Clean header with:
- Mobile menu trigger (only on mobile)
- Page title showing current section
- Sign out button (right side)

```typescript
function OwnerHeader({ 
  activeSection, 
  onMobileMenuOpen, 
  onSignOut 
}: OwnerHeaderProps) {
  const isMobile = useIsMobile();
  
  return (
    <header className="h-14 border-b bg-card px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onMobileMenuOpen}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold">H</span>
          </div>
          <div>
            <h1 className="font-semibold text-sm md:text-base">Owner Dashboard</h1>
            <p className="text-xs text-muted-foreground capitalize hidden md:block">
              {sectionLabels[activeSection]}
            </p>
          </div>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onSignOut}>
        Sign Out
      </Button>
    </header>
  );
}
```

### 4. Polish All Content Sections

#### Overview Cards - Clean grid with proper spacing
```typescript
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  <Card className="p-5">
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
      Total Users
    </p>
    <p className="text-3xl font-bold mt-2">{totalUsers}</p>
  </Card>
  ...
</div>
```

#### User Management - Professional list items
```typescript
<div className="divide-y">
  {users.map((user) => (
    <div
      key={user.id}
      className={cn(
        "flex items-center justify-between py-4 px-2 first:pt-0 last:pb-0",
        isActiveAdmin(user.id) && "bg-success-muted/50 -mx-2 px-4 rounded-lg"
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback>{user.full_name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{user.full_name || "No name"}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="capitalize">{getUserRole(user.id)}</span>
            {isActiveAdmin(user.id) && (
              <Badge variant="outline" className="text-success border-success/50 gap-1">
                <ShieldCheck className="h-3 w-3" />
                Active
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Admin buttons */}
      </div>
    </div>
  ))}
</div>
```

#### Section Headers - Consistent pattern
```typescript
<div className="mb-6">
  <h2 className="text-xl font-semibold">{sectionTitle}</h2>
  <p className="text-sm text-muted-foreground mt-1">{sectionDescription}</p>
</div>
```

### 5. Mobile Sidebar Controlled from Parent

The OwnerSidebar will expose an `open` and `onOpenChange` prop for mobile sheet control:

```typescript
// OwnerSidebar.tsx - Updated props
interface OwnerSidebarProps {
  activeSection: OwnerSection;
  onSectionChange: (section: OwnerSection) => void;
  pendingAdminRequests?: number;
  pendingScoutApplications?: number;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

// Component uses mobileOpen and onMobileOpenChange for Sheet
```

---

## Visual Improvements Summary

| Section | Improvements |
|---------|-------------|
| Header | Clean, minimal, section-aware title |
| Overview | Tighter grid, better card proportions |
| User Management | Avatar-based list, divide lines, subtle admin highlight |
| Admin Requests | Card-based design matching User Management |
| Scout Applications | Existing cards are good, just better spacing |
| Videos | Compact list with status badges |
| Subscriptions | Visual progress bars with icons, clean grid |
| Settings | Toggle cards with proper descriptions |
| Player Search | Search input with results grid |

---

## Layout Structure

```text
+--------------------------------------------------+
| OwnerHeader (h-14)                               |
| [Menu] Owner Dashboard              [Sign Out]   |
+--------+-----------------------------------------+
| Sidebar|  Main Content Area (scrollable)         |
| (w-64) |                                         |
|        |  Section Title                          |
| [Nav]  |  Section Description                    |
|        |                                         |
|        |  +----------------------------------+   |
|        |  |  Content Cards / Lists          |   |
|        |  +----------------------------------+   |
|        |                                         |
+--------+-----------------------------------------+
```

On mobile, the sidebar becomes a Sheet drawer triggered from the header menu button.

---

## QA Checklist

1. **Navigation**
   - Verify only ONE menu button visible on mobile
   - Verify sidebar is persistent on desktop (no menu button in sidebar area)
   - All section navigation works correctly
   - Badge counts display for Admin Requests and Scout Applications

2. **Visual Polish**
   - Cards have consistent padding
   - Lists have proper spacing and dividers
   - Admin users clearly highlighted with green accent
   - Mobile view looks clean and professional

3. **Functionality**
   - Sign out works
   - Make Admin / Revoke Admin works
   - Admin request approve/reject works
   - Player search works
   - All sections render correctly

