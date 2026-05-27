## Add collapse arrow to Command Center

Mirror the `IdentityCommandCard` pattern: a chevron in the top-right of the header row collapses the entire Command Center body.

### Changes

`src/components/command/CommandCenterSection.tsx`
- Add `open` state (default `true`), persisted in `localStorage` under `command.center.open`.
- Wrap the existing header row in a `<CollapsibleTrigger asChild>` button so the whole header is clickable. Keep `TodayOverviewHeader` on the left; add a `ChevronDown` on the right that rotates 180° when open. Include `aria-expanded` / `aria-label`.
- Wrap the escalation banner + 4-card grid + "Show more details" disclosure inside `<CollapsibleContent>` using the same `data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up` classes used by IdentityCommandCard.
- When collapsed, only the header row is visible (matches identity-card behavior).

### Out of scope

No changes to projections, hooks, card internals, escalation logic, `/today`, `/command`, Dashboard mount, or any runtime/replay logic. Pure UI.