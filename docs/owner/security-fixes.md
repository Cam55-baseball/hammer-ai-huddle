# Security fixes — 2026-10-11 (owner-authorized)

Snapshot first: `public._snapshot_security_20261011` holds every bucket's prior public/private setting, every prior storage and access rule touched, and the old `is_coach_of` definition (service-role only). Revert = restore from it.

## A1. Athlete and applicant media is now private — DONE
- Switched private: `videos` (1,345 files), `scout-letters` (29), `scout-videos` (29), `avatars` (17). Left public: `promo-videos`, `custom-logos` (marketing/team logos, no athlete media).
- One access rule, `can_view_athlete_media(viewer, athlete)`: the athlete; owner/admin; the authorizing parent; otherwise never for under-13 or blocked pairs, and only a connected coach (`is_coach_of`) or an accepted follow by a real coach/scout/recruiter — for 13–17 the follow also needs parent-authorized recruiting consent with video sharing.
- Owner/admin library and drill clips (`<id>/library/…`, `library_` thumbnails) stay viewable by every signed-in user (Players Club, drill library, bundles).
- Applicant letters/videos: applicant + owner/admin only. Avatars: signed-in users, except under-13 avatars (self/parent/staff only).
- App: stored links are unchanged in the database but are swapped on display for 1-hour signed links (`src/lib/media/privateMedia.ts`, installed in `main.tsx`; covers on-screen players/images, off-screen video loading for thumbnails/analysis/pose, and downloads). Backend analysis functions already read files through the storage API.
- Proof: raw old public link to a real athlete clip → refused ("Bucket not found"); anonymous signing → refused; signed-in allowed viewer → signed link plays (HTTP 206 video). Simulated sessions: player sees 25/25 own clips, connected coach 25/25, unconnected user 0/25; unconnected user sees 0/58 applicant files, 9/9 library clips.

## A2. Self-claimed roles — DONE
- Database: a user may add only `player` (active) or REQUEST `coach`/`scout`/`recruiter` as `pending`; admin/owner never. Applications must start `pending`. `ProfileSetup` now requests staff roles as pending; the owner approves in the existing approval queue / `approve-scout-application`.
- Proof (rolled-back simulated player): self coach-active blocked, self admin blocked, self-approved application blocked, pending scout request allowed.

## A3. Organizations, follows, folder grants — DONE
- Self-join only as `player`; organization co-membership gives coach access only to an active coach holding a non-player seat (`is_coach_of` fixed).
- Follows (trigger `guard_follow_transitions`): new requests must be `pending`; initiator must match the signed-in side; only the OTHER side can accept; ids/initiator locked; no re-opening. Owner/admin/backend exempt.
- Folder grants: only the folder's actual owner may grant, and only to a coach they are connected with.
- Proof: join-as-coach blocked; player self-accepted follow blocked; player accepting own request blocked; coach accepting player's request allowed; forged grant on another's folder blocked. Existing 2 grants and all 37 follows checked valid/untouched.

## A4. Minors — PARTLY DONE
- Media and contact now share one rule: under-13 hidden from all staff, 13–17 need parent-authorized consent, blocks respected. New `can_view_athlete_contact`: player email shows to staff only under contact consent (or a connected coach of an adult). The app has no direct messaging between users.
- Not yet unified: older read rules on sessions, grades and `session_videos` still use the legacy "any accepted follow" helper; `get-player-library` coach path. Listed for the scouting v2 plan.

## Behaviour changes to know
- Under-13 players' clips are no longer visible to their coaches (only parent/owner/admin), per "under-13 hidden".
- Signed-out visitors cannot see athlete videos or avatars anywhere.
- Coaches/scouts who signed up after today wait for owner approval before getting access.
