## Goal
Make the Owner Overview easier to scan and friendly on mobile: clearer section grouping with color separation, less visual density, and verified mobile end-to-end usability across the dashboard.

## 1. Reorganize the Overview into Clear, Labeled Sections

Right now the Overview stacks four blocks with no visual hierarchy: action queue → KPI strip → activity → quick actions. Replace with three clearly labeled sections, each with a colored accent stripe so groupings are obvious at a glance.

```text
┌────────────────────────────────────────────────────┐
│ ⚠ Needs Attention            (amber accent)        │
│   [ Admin Requests · 3 ]  [ Scout Apps · 2 ]       │
└────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────┐
│ 📊 At a Glance               (blue accent)         │
│   Users · Subs · Videos · Avg Score                │
└────────────────────────────────────────────────────┘
┌──────────────────────────┬─────────────────────────┐
│ 🕒 Recent Activity        │ ⚡ Quick Actions         │
│   (slate accent)          │   (emerald accent)      │
└──────────────────────────┴─────────────────────────┘
```

Behavior:
- Each section has a small section header (icon + label) and a left-side colored border/strip on the cards inside it to bind them visually.
- "Needs Attention" is hidden entirely when both queues are empty (so the page doesn't shout when there's nothing to do).
- KPI cards become semantic-color-tinted: Users (primary), Subs (emerald/success), Videos (blue/info), Avg Score (amber). Subtle bg tint + matching icon color, not loud.
- Recent Activity gets per-event colored dots (user=primary, video=blue, scout=amber, build=emerald) so the list reads faster.
- Quick Actions split into two visual rows: "Create" (3 buttons) and "Jump to" (2 buttons), with a thin divider and labels.

Color usage: only semantic Tailwind tokens already in `index.css` (`primary`, `success`, `destructive`, `muted`, plus `amber-500`, `blue-500`, `emerald-500` opacity tints which the project already uses elsewhere). No new design tokens.

## 2. Mobile End-to-End Usability

Audit and fix the entire owner dashboard at 375–414 px.

Specific fixes:
- **Header**: breadcrumb already responsive; verify Sign Out button's text hides on `sm:` (it does), and the burger menu opens the sidebar Sheet (already wired). Confirm the back button + breadcrumb don't truncate awkwardly on a 360 px screen — add `min-w-0` + `truncate` on the breadcrumb label.
- **Overview action queue**: stack to single column under `sm`; Card content goes vertical (icon row on top, CTA full-width below) so the count + label never get squeezed.
- **KPI strip**: keep `grid-cols-2` on mobile (good), but reduce padding to `p-3` and the number to `text-xl` so all four fit nicely.
- **Recent Activity + Quick Actions**: stack vertically on mobile (already `lg:col-span-2`); ensure Quick Actions buttons are full-width and tap targets ≥ 44 px (`h-10`).
- **Sidebar (Sheet) on mobile**:
  - Verify the pin/reorder hover controls work via tap on touch — replace `group-hover/item:flex` with a "tap to reveal" pattern: on mobile, controls are always visible but smaller, OR add a single `…` overflow menu per item.
  - Ensure ScrollArea fills the Sheet height and groups stay tappable.
- **Builds list rows**: on mobile, stack the action button column under the title instead of side-by-side, so labels don't truncate.
- **Users list rows**: collapse "Make Admin / Approve / Reject / Revoke" buttons into a `…` dropdown menu on `sm` and below; keep badges visible.
- **Scout Applications tabs**: ensure `grid-cols-3` works at 375 px (currently fine after we removed "All").
- **Subscriptions Module Distribution**: already responsive (`md:grid-cols-3`), confirm progress bars don't overflow on small screens.
- **Player Search**: input + result rows need `flex-wrap`; the Profile/Library buttons should sit below the avatar block on mobile, not wrap awkwardly.

After edits, validate by opening the preview at mobile viewport (375×812) and walking through every section.

## 3. Out of Scope
- No backend, RLS, or data-shape changes.
- No new dependencies.
- Sidebar grouping/pinning behavior stays as just shipped — only the touch-affordance tweak above.

## Technical notes
- Edit `src/components/owner/OwnerOverview.tsx`: add three section wrappers (`<SectionHeader/>` inline component), per-card accent borders (`border-l-4 border-amber-500/60` etc.), color-mapped KPI cards, color-coded activity dots, split Quick Actions.
- Edit `src/pages/OwnerDashboard.tsx`:
  - Builds row → vertical action stack on mobile (`flex-col sm:flex-row`).
  - Users row → wrap actions in a `DropdownMenu` on `sm:hidden`, keep inline on `sm:flex`.
  - Player Search row → `flex-wrap` + full-width buttons on mobile.
- Edit `src/components/owner/OwnerSidebar.tsx`: replace `group-hover/item:flex` with `flex` on mobile (use `md:hidden md:group-hover/item:flex` pattern), or always-visible compact controls under `md`.
- No new files. Pure presentation work.
