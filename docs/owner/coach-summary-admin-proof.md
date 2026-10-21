# Oct 21 19:30 UTC — coach summary, TEST admin audit, Report Card, nightly pair

390×844 Chromium (iPhone-size), real sign-in form, passwords randomized then scrambled.

## Coach summary (item 7) — hitter Done, pitcher blocked
- democoach sent a request from Coach dashboard → "Add a player" (exact email search); TEST hitter (Demo — College Outfielder) tapped Accept on /requests ("Accepted — access is on now").
- democoach → /coach/athlete/db9cc8ef… → Development tab: "Hammers' plan for this player", Today · baseball, health-private notice, saved warm-up/recovery blocks with "Because" lines. "Six-week summary and practice ideas" opens "Six-week saved plans" (Warmup: 2 saved days, 2026-10-20 to 2026-10-21; Fueling …). Screenshots /tmp/browser/cs/hitter_1.png, hitter_2.png.
- TEST pitcher (14): coach search returns "No athletes found" — under-18 players only appear with parent permission (child-safety rule, left as is). The player-side "Find Coach" hides test coach accounts. The pitcher also has no saved plans (assessment unfinished). Not proven.
- Connection left in place for review; remove at batch cleanup.

## TEST admin list audit (item 8) — Done
- Hosted list functions touching people: list_my_coaches, list_my_requests_v2, list_org_roster, search_athletes_to_connect, team_discipline_summary carry the exclusion. list_my_requests (own requests only; admin has 0 requests) and list_org_pending_verification (organizations, not people) need none.
- Client screens: owner dashboard, coach roster/pool, admin-search-users, search-players exclude it; other owner screens (transcripts, moderation, training intelligence) only look up names for rows the admin doesn't have; coach search lists coaches only and hides system accounts. TEST admin: system account, admin role only, 0 requests, 0 follows.

## Internal Report Card (item 8) — Done
- TEST admin → /progress → Performance: "Internal — not released", "Hammers Report Card", every grade "Grade coming with camera measurement", 0/13 source signals. Screenshot /tmp/browser/rc/rc.png.

## Nightly pair (item 12) — blocked
- Players get HTTP 403 reading or marking `intelligence_recommendations` (no table grant ever given), so the "Do this" list shows "We couldn't load your saved advice" for everyone and "Yes, I did it" can't save. Fix needs a migration — not applied without the owner naming it.
- Even then, the nightly judge needs a re-test video 14–28 days after "followed", so no honest pair can exist tonight. No TEST player has any recommendation yet.
