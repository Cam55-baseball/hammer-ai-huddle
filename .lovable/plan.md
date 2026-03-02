

# Integrate ConnectionsTab into the App

## Problem

The `ConnectionsTab` component (with Head Coach selection, Find Coach, pending requests, folder permissions matrix) was built but never added to any page or route. The `/my-followers` page is an older, simpler followers list that doesn't use it.

## Solution

Replace the content of the `/my-followers` page with the `ConnectionsTab` component so all the coach connection management features are accessible from the existing sidebar navigation.

## Changes

### File: `src/pages/MyFollowers.tsx`

- Import and render `ConnectionsTab` instead of the current manual followers list
- Keep the `DashboardLayout` wrapper and page header
- Remove the old manual follower fetching, removal dialog, and realtime subscription code (all of this is handled inside `ConnectionsTab`)
- The page becomes a thin wrapper:

```text
DashboardLayout
  Page Header ("My Connections" / subtitle)
  ConnectionsTab  <-- renders everything: Find Coach, pending requests,
                      active coaches with Head Coach toggle, folder permissions
```

- Optionally rename the page title from "My Followers" to "My Connections" to reflect the broader scope (finding coaches, setting head coach, managing permissions)

### No other files need changes
- The sidebar already links to `/my-followers` with the Users icon
- `ConnectionsTab` is self-contained with its own queries, mutations, and sub-components

