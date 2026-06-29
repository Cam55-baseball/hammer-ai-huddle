## Problem

`/iq?lens=offense` shows "no situations published yet" for baseball. DB confirms: zero published `iq_situations` are tagged with the `offense` lens for `sport in ('baseball','both')`. Only softball has 7 offense-tagged rows. Defense and pitching are well covered (~70+ rows). The offense lens was never seeded for baseball.

## Fix

Ship a seed migration adding a Wave-O1 set of offense situations covering both sports (`sport = 'both'`) so baseball and softball players both see content, plus baseball-only entries where rules diverge from softball (lead-off timing, pickoffs, balks).

### Content (≈18 situations, all `lens_tags` include `offense`; some also tag `baserunning`)

At-bat / hitter IQ
1. Hitter's count (2-0, 3-1) — sit on zone, drive the pitch
2. Two-strike approach — shorten up, battle, foul off
3. Runner on 3rd, <2 outs — contact / sac fly mindset
4. Behind in count vs off-speed pitcher
5. Leadoff at-bat of an inning — work the count
6. Hit-and-run mechanics (hitter side) — protect the runner
7. Bunt for a hit vs sac bunt read

Baserunning IQ (offense)
8. Primary + secondary lead off 1B
9. Reading the ball off the bat from 1B (line drive freeze)
10. Tag-up at 3B on fly ball — depth & angle
11. First-and-third offense — delayed steal / read throw
12. Stealing 2B — pitcher tells, jump timing
13. Going first-to-third on a single to RF
14. Scoring from 2nd on a single — picking up the 3B coach
15. Avoiding the tag at home — slide angle / hand-swipe
16. Rundown survival — stay alive, draw the throw

Baseball-only (sport='baseball')
17. Reading a LHP pickoff move at 1B (balk tells)
18. Lead off 2B with pitcher in the stretch (sign relay awareness)

Each row populated with: `slug`, `title`, `summary`, `lens_tags: ['offense']` (or `['offense','baserunning']`), `sport`, `difficulty`, `status='published'`, `canonical_order`, plus matching `iq_situation_actors` (Three B's where applicable — runner Bag/Backup, hitter Ball) and 2–3 `iq_scenarios` MCQ variants per situation following the existing schema used by Wave-C1.

### Files

- `supabase/migrations/<ts>_iq_wave_o1_offense_seed.sql` — inserts situations + actors + scenarios. Idempotent via `ON CONFLICT (slug) DO NOTHING`.

### Verification

After migration, re-query `iq_situations` grouped by lens/sport and confirm offense rows exist for `baseball` and `both`. Load `/iq?lens=offense` in preview as baseball user and confirm cards render. No app code changes needed — `useIqSituations` already filters by lens once data exists.

### Out of scope

No changes to filtering logic, no UI changes, no progress/SM-2 schema changes.