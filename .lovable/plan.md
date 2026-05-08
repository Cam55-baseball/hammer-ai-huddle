## Goal
The Owner Dashboard currently shows 13 flat sidebar items, four low-signal stat cards, a Module Distribution panel, and dense list sections. We will rework it into a focused command center: grouped sidebar with owner-pinnable favorites, an action-first overview, and cleaner section layouts.

## 1. Sidebar — Grouped + Pinnable

Replace the flat 13-item list with collapsible groups and a "Pinned" header section the owner controls.

```text
[ Pinned ]                 ← user-curated, drag/drop or pin button
  ★ Admin Requests (3)
  ★ Builds

[ Overview ]
  Overview

[ People ]
  User Management
  Admin Requests (badge)
  Scout Applications (badge)

[ Content ]
  Recent Videos
  Video Library
  Drill CMS
  Promo Engine

[ Commerce ]
  Builds
  Subscriptions

[ Engine & System ]
  Engine Settings
  Settings
  Player Search
```

Behavior:
- Each non-Pinned item shows a small `Pin` icon on hover; clicking adds/removes from the Pinned section.
- Pinned section appears at the top, always expanded, with a star next to each item.
- Pin order is editable via simple up/down arrows on hover (no drag library required).
- Pins persist per-owner in `localStorage` under `owner_dashboard_pins_v1` (no DB change needed for a UI-only preference).
- Groups are collapsible; the group containing the active section auto-expands. Collapsed state persists in `localStorage`.
- Badges (admin requests, scout applications pending) follow the item into the Pinned section.

## 2. Overview — Action-First Command Center

Replace the four generic KPI cards + Module Distribution with a layout that surfaces what an owner actually needs to act on.

Top row — Action Queue (only renders cards that have items):
- Pending Admin Requests → click jumps to that section
- Pending Scout Applications → jumps
- Builds awaiting payout / new buyers (if applicable, otherwise hidden)

Second row — Compact KPI strip (single row, smaller cards):
- Users · Active Subs · Videos (7d) · Avg Score
- Each card is a single line with label + number + tiny delta vs prior 7d when available; remove the oversized icon tiles.

Third row — Two-column:
- Left: Recent Activity feed (last 10 events: new signups, new builds, new scout applications, recent video analyses) with timestamps.
- Right: Quick Actions (New Program / New Bundle / New Consultation / Open Player Search / Open Engine Settings).

Remove the standalone "Module Distribution" panel from Overview; move it into the Subscriptions section (where it belongs contextually).

## 3. Section Layout Cleanup

- **Header simplification**: Remove the duplicated section title (currently appears in both the top header and the page body). Keep it only in the page body.
- **Users section**: Add a search/filter bar at the top, role filter chips (All / Admin / Pending / Rejected / User), and condense the row layout — single-line meta, action buttons collapse into a `…` menu on small screens.
- **Builds section**: Move "Quick Create" into a single `+ New` split-button in the section header (Program / Bundle / Consultation as menu items). The list of builds becomes the primary content.
- **Scout Applications**: Keep tabs but remove the redundant "All" tab (use Pending by default; Approved/Rejected are enough).
- **Videos**: Add date range + status filter, default to last 30 days. Show a compact table-like list.
- **Subscriptions**: Move Module Distribution panel here above the existing per-module cards.

## 4. Header Trim

- Drop the "Owner Dashboard" + section subtitle stack — replace with a single small breadcrumb: `Owner › {Section}`. This frees vertical space.
- Keep Back, Sign Out, mobile menu trigger.

## 5. Out of Scope
- No backend/RLS changes.
- No changes to engine logic, drill CMS internals, or video library manager internals — only the wrapping shell.
- No new dependencies.

## Technical notes
- Edit `src/components/owner/OwnerSidebar.tsx`: introduce a `groups` config, a `usePinnedOwnerSections` hook (localStorage), and render Pinned + groups. Add hover Pin icon + collapse chevrons (use existing `Collapsible` from `@/components/ui/collapsible`).
- Edit `src/pages/OwnerDashboard.tsx`: replace the Overview block; trim duplicated headers; add `+ New` menu in Builds; add filter bar in Users and Videos. Move Module Distribution into the Subscriptions block.
- New small component: `src/components/owner/OwnerOverviewActionQueue.tsx` for the action queue + recent activity (data already loaded in `loadDashboardData`).
- No new routes, no DB migrations, no edge functions.
