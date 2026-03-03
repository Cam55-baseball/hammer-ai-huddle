

# Updated Plan: Coach-Player Information Loop

Removes coach-to-player feedback messaging (player notes stay private) and session verification notifications (stays as-is). Focuses on **team announcements** and **enhanced player org view** only.

---

## 1. Team Announcements (new table + UI)

**Database migration** — create `team_announcements` table:
- `id` (uuid PK), `organization_id` (FK → organizations), `author_id` (FK → auth.users), `title` (text), `body` (text), `pinned` (boolean default false), `created_at` (timestamptz)
- RLS: org members can SELECT; org owner/coaches can INSERT/UPDATE/DELETE

**Coach UI** — new `TeamAnnouncements.tsx` component:
- Compose form (title + body + pin toggle) for coaches
- List of existing announcements with edit/delete
- Add as a new "Announcements" tab in `OrganizationDashboard.tsx`

**Player UI** — surface pinned/recent announcements at the top of `PlayerOrganizationView.tsx`

## 2. Enhanced Player Organization View

Update `PlayerOrganizationView.tsx` to show:
- **Team Average MPI** vs player's own (data from existing `useTeamStats`)
- **Pinned Announcements** from `team_announcements`
- **Recent Sessions** with coach-led badge (query `performance_sessions` where `coach_id IS NOT NULL`)

No feedback inbox, no verification badges — keeps things clean and focused on team context.

---

## Files

| Action | File |
|--------|------|
| **Migration** | Create `team_announcements` table + RLS |
| **New** | `src/components/organization/TeamAnnouncements.tsx` |
| **Edit** | `src/pages/OrganizationDashboard.tsx` — add Announcements tab |
| **Edit** | `src/components/organization/PlayerOrganizationView.tsx` — add announcements + team MPI comparison |

