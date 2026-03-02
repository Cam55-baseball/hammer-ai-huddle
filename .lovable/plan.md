

# Quick Link from Coach Dashboard to Organization Roster

## Current State (answering your questions)

**When a coach registers an organization:**
They fill in a name, sport, and type (Team/Facility/Academy) on the Organization Dashboard. This creates the org with them as the owner.

**How players join the roster:**
This is already built! On the Organization Dashboard's "Invite" tab, the coach can generate a unique 6-character invite code (e.g., "K7M3PX"). Players enter this code in the "Join an Organization" card, which looks up the org, shows the team name, and lets them confirm to join. Once joined, they appear on the Roster tab automatically.

**What's missing:**
There's no easy way to get from the Coach Dashboard to the Organization Roster. That's the one change needed.

## Plan

### Add Organization Quick Link to Coach Dashboard

**File: `src/pages/CoachDashboard.tsx`**

- Query the `organizations` table to check if the current coach owns an org (reuse the pattern from `useOrganization`)
- If they do, add a quick-action card/button near the top of the dashboard (below the header, above the players list) that links to `/organization`
- The card will show the org name, member count, and a "View Roster" button
- If they don't own an org, show a subtle "Create an Organization" link instead

The quick link will be a compact card:
```
[Building2 icon] Your Organization: "Team Name" -- 12 players
                                        [View Roster] button
```

This navigates to `/organization` where the Roster tab with position groups, filters, and player details is already fully built.

### No other changes needed

The invite code system and "Join an Organization" flow for players are already fully functional. No database changes required.
