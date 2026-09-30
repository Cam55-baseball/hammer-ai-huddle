# Category grouping and scoring — all six report cards

You asked for a report before finalising, so this is the allocation for your check. Nothing is built yet. Once you approve (or correct) it, I build it, run all three fixtures and send the scores for clip 914cf54c.

## Rules that apply to every card

- **Points inside a category:** each tile gets 1 weight unit and non-negotiables get 2. Points are then split to whole numbers in that ratio. The category meter is the weighted average of the tiles that were measured.
- **Record-only tiles:** they show their value and are worth 0 until the athlete has 8 clips in the same camera context. After that they score on how close the reading sits to that athlete's own range. Inside the band is full points. Points fall linearly to 0 at twice the band width. There is no universal optimum.
- **Incomplete threshold:** a category shows INCOMPLETE, with the reason, unless measured tiles hold **at least 60% of its points AND** every non-negotiable in it returned a verdict. Why: at 60% the unmeasured tiles cannot move the meter by more than about a grade band. Also, a category graded without its most important tile is not that category's grade. Record-only tiles still waiting on a baseline count as neither measured nor missing.
- **Total:** it only shows when every scored category is complete. Otherwise it reads "Incomplete: X of Y categories measured". The still clip therefore gives no numbers at all.
- **Numbers:** allowed on meters and totals. The words describing what happened stay coach language with no numbers.

## 1. Hitting (baseball and softball: same structure, weights and order)

| Category | Pts | Tile allocation |
|---|---|---|
| P1 Create Balance | 20 | Back hip socket rotation at P1 **13** (hip load, NN) · Back-leg balance at load 7 |
| P2 Gather | 13 | Bow and arrow 5 · Hand load depth 4 (record-only) · Hand load timing vs pitcher 4 |
| P3 Load by Stride | 17 | Back hip socket holds **3** (hip load, NN) · Head path 2 · Head discipline 2 · Back heel down 2 · Stride direction 2 · Foot-down timing vs pitcher 2 · Back knee 1 · Front heel 1 · Hands outside shoulders 1 · Hands above back elbow 1 |
| P4 Hitter's Move | 40 | Sequence **9** (NN) · Chin-to-shoulder / front-shoulder leak **9** (NN) · Hands back, elbow forward 5 · Shoulder plane steadiness 5 (score) · Lead elbow bend 4 · Head not rising 4 · Hips rotate, not drift 4 |
| The Finish | 7 | Pelvis square to fair 4 · Finish balance 3 |
| Front Leg Gather | +3 | New tile. It detects kick / toe tap / float / knee turn / none in the P2 window. It scores the move's dynamics when a gather is present and **never deducts**. It sits beside P2 on screen. |

The `hitters_move` composite becomes the P4 meter and is not shown as a tile.

## 2. Baseball pitching (proposal)

| Category | Pts | Tiles |
|---|---|---|
| Balance & Set | 13 | **No tile exists yet**. Starting posture and balance still need your definition (still open from last round). The category reads INCOMPLETE until you define it. |
| Lift & Thrust | 17 | Lift & thrust simultaneity 8 · Energy angle 5 · Eyes on target at peak lift 4 |
| Drive & Stride | 23 | Tempo 5 · Stride length 5 · Drag line 5 · Balance at landing 4 · Head stability 4 |
| Release | 40 | Hip/shoulder separation **14** (2×) · Shoulder tilt 7 · Head at release 7 · Stack & track 6 · Release extension 6 |
| The Finish | 7 | Glove control 4 · Finish balance 3 (glove swivel still refuses permanently) |

The spare 3 points go to **Drive & Stride** because it has the most tiles that actually measure today. I agree Release should be heaviest.

## 3. Throwing (baseball and softball, throwing terms only)

**Arm Care** sits at the top with no weight. It holds three flags, each ending with a referral to a qualified coach or medical professional.

| Category | Pts | Tiles |
|---|---|---|
| Rhythm | 30 | Throwing tempo (top of leg lift to front-foot strike, all three patterns) |
| Load | 20 | Shuffle energy angle. It only applies to a sideways shuffle throw. For a crow hop or walk-through the category shows "not used for this throw" and its points come out of the total. |
| Stride | 25 | Stride from the final step |
| Head & Balance | 25 | Head through the throw |

## 4. Softball windmill

**Safety Flags** show with no weight: the two knee-caving flags.

| Phase | Pts | Tiles |
|---|---|---|
| Wind-up | — | **No tiles.** All three were cut by the elite filter, so no honest meter is possible. |
| Stride | 55 | Stride triple extension 30 · Foot angle at landing 25 · plus record-only stride at landing/release and separation |
| Acceleration | 45 | Arm path 45 · plus record-only forward lean |
| Follow-through | — | **No tiles.** No honest meter is possible. |

The card shows phase meters only and **no total** until Wind-up and Follow-through have tiles.

## Things I think are wrong or need your ruling

1. **Hip load vs the staff-only rule.** Back hip socket hold is tile 20, and it stays staff-only until 10 confirmed clips. So for athletes, P1 and P3 will read INCOMPLETE because their non-negotiable can't be shown. The alternatives are to score it for staff only, or to lift the rule for this tile.
2. **Nothing detects the pitcher in frame yet.** Hand load timing and foot-down timing will always be missing. Proposal: mark them "pitcher not in frame", leave them out of the incomplete check, and say so on the meter. Otherwise P2 can never complete, since timing plus a depth tile with no baseline is too much missing.
3. **Front Leg Gather out of 100.** If the total is 97 + 3, a hitter with no gather tops out at 97, which is a quiet deduction. Proposal: scale the five main categories to 100 and add the gather as a bonus capped at 100.
4. **"P4 composite double weight."** If the composite *is* the P4 meter, double weight inside its own category has no meaning. I've read it as already met by P4 being worth 40. Tell me if you meant something else.
5. **Release extension** has no honest pass range (the noise is bigger than half the standard). It can only fail clearly outside the band. Otherwise it counts as missing.
6. **Throwing has only four mechanics tiles**, so each category is a single tile. The meters are honest but thin.
7. **Softball wording** will be written fresh (circle, windmill, slap), not swapped labels. **For your ruling during validation, unchanged for now:** slappers gather differently, and softball's shorter reaction time may change the P2/P3 timing tiles.

## Technical section

- New `src/lib/reportCard/categories/` holds the category specs per card, `scoreCategory()` (weights, 60% + NN rule, record-only proximity via `athleteBaseline.ts`) and `scoreCard()`.
- New pose tile `front_leg_gather` in `hittingCardTiles.ts`. Its still-clip floor gets measured before any threshold is set. The pose bundle gets rebuilt.
- The existing tile readers are reused. Tile names are mapped to your headings, and any tile with no reader is marked missing (never invented).
- The UI groups tiles under category headers with a meter per category. Arm Care and Safety sections are shown with no score.
- Tests: the still clip gives no category scores (all incomplete); swing clips refuse the pitching/throwing/windmill cards; clip 914cf54c category scores go in the report. No iOS/Capacitor changes, and no deploy.
