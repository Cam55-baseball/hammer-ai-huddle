

# Practice Hub: Throwing, Hitting Advanced, Baserunning Goals, Game Scorecard, and League Distances

This is a large effort spanning 5 areas. Here is the plan broken into discrete deliverables.

---

## 1. Throwing Session Optimization

**Problem**: Throwing module has no dedicated rep sources or fields — it uses the generic fielding flat list (fungo, live, drill, game, other) which is inappropriate.

**File: `src/components/practice/RepSourceSelector.tsx`**
- Add `THROWING_SOURCES` grouped list:
  - **Long Toss**: `long_toss` (progressive distance throws)
  - **Flat Ground**: `flat_ground_throw` (mechanical work)
  - **PFP / Position**: `pfp` (pitcher fielding practice), `position_work` (position-specific throws)
  - **Live**: `live`, `game`
  - **Other**: `other`

**File: `src/components/practice/ThrowingRepFields.tsx`** (new)
- Quick mode fields: Throw Distance band (60ft / 90ft / 120ft / 150ft / 180ft / 200ft+ for baseball; shorter bands for softball), Throw Accuracy (On Target / Off Target / Wild), Arm Feel (Fresh / Normal / Fatigued)
- Advanced mode fields: Carry Grade (slider 20-80), Spin Quality (carry/tail/cut/neutral), Exchange Time band, Footwork grade

**File: `src/components/practice/RepScorer.tsx`**
- Add `isThrowing = module === 'throwing'` check
- Render `ThrowingRepFields` when `isThrowing`
- Sport-aware distance bands (baseball distances are longer than softball)

---

## 2. Hitting Advanced Questions

**Problem**: Hitting advanced mode has Contact Quality, Exit Direction, Swing Intent, and Batted Ball Type. Could be richer.

**File: `src/components/practice/RepScorer.tsx`** — hitting advanced section
- Add: **Approach Quality** (patient / aggressive / neutral) — self-assessment of plate discipline
- Add: **Count Situation** (ahead / behind / even / first_pitch) — simulated count context
- Add: **Adjustment Tag** (stayed back / got on top / shortened up / extended / none) — what mechanical cue they applied
- These are toggles/grids in the existing advanced block, no new component needed

---

## 3. Baserunning: Rep Goal and Sport-Aware Optimization

**Problem**: Baserunning only has Jump Grade, Read Grade, and Time to Base — no rep goal, no sport differentiation, and no target rep count.

**File: `src/components/practice/BaserunningRepFields.tsx`**
- Add **Drill Type** selector (sport-aware):
  - Baseball: Home-to-1st, 1st-to-3rd, 2nd-to-Home, Steal 2nd, Steal 3rd, Delayed Steal, Hit-and-Run, Tag-Up, Lead Work
  - Softball: Home-to-1st, 1st-to-3rd, 2nd-to-Home, Steal 2nd, Slap-and-Run, Bunt-and-Run, Tag-Up, Lead-off (where applicable)
- Add **Goal of Rep** selector: Safe / Practice Read / Work on Jump / Speed Work / Situational
- Use sport prop to show appropriate drills

**File: `src/components/practice/SessionConfigPanel.tsx`** or `PracticeHub.tsx`
- When module is baserunning, show a **Target Reps** input (e.g., "Goal: 10 reps") in the session config. This gives users a target displayed in the logging UI as a progress indicator.

---

## 4. Game Scorecard Overhaul — Personal Scoring Page

**Problem**: Current `GameScorecard` is hitting-only (at-bats with pitch-by-pitch). It needs to work for ALL modules when `sessionType === 'game'`, look like a personal player scoring sheet, and have advanced toggles.

**File: `src/components/practice/GameScorecard.tsx`** — Major rewrite
- Redesign as a **personal game log** that looks like a traditional scoring sheet for a single player
- **Header**: Player name, date, opponent (from `GameSessionFields`), game number
- **Innings row**: Scrollable innings (1-9+ for baseball, 1-7+ for softball) with current inning indicator
- **Per-inning entry** (hitting view): At-bat result, pitch count, RBI, runs scored, stolen bases
- **Per-inning entry** (pitching view): IP, H, R, ER, K, BB, pitches thrown, pitch type breakdown
- **Per-inning entry** (fielding view): Plays made, errors, assists, putouts
- **Advanced toggle** per at-bat/inning: Expands to show pitch-by-pitch detail (current pitch location grid + result flow)
- **Running stat line** at top: Batting line (AB/H/RBI/R/BB/K), Pitching line (IP/H/R/ER/K/BB), Fielding line (PO/A/E)
- **Profile link**: Button/link that navigates to the player's profile page (`/profile` or team profile if in org)

**File: `src/pages/PracticeHub.tsx`**
- Pass sport, player info, and opponent info to `GameScorecard`
- Game scorecard should be used for ALL modules when `sessionType === 'game'` (not just hitting/pitching)

---

## 5. League Distance Rules

**Problem**: No enforcement of standard distances by sport/age level.

**File: `src/data/baseball/leagueDistances.ts`** (new)
- Standard distances by level:
  - **MLB/College/HS**: 60ft 6in mound, 90ft bases
  - **14U**: 60ft 6in mound, 90ft bases
  - **13U**: 54ft mound, 80ft bases
  - **12U**: 50ft mound, 70ft bases
  - **10U**: 46ft mound, 65ft bases
  - **8U**: 42ft mound, 60ft bases

**File: `src/data/softball/leagueDistances.ts`** (new)
- **College/HS**: 43ft circle, 60ft bases
- **14U**: 43ft circle, 60ft bases
- **12U**: 40ft circle, 60ft bases
- **10U**: 35ft circle, 55ft bases

**File: `src/components/practice/SessionConfigPanel.tsx`**
- Add optional **League/Level** selector (8U, 10U, 12U, 14U, HS, College, Pro)
- When selected, auto-populate pitch distance with the standard mound distance for that level
- Show distance as informational badge: "Standard: 60'6" mound, 90' bases"
- User can still override manually

---

## Files Summary

| File | Action |
|------|--------|
| `src/components/practice/RepSourceSelector.tsx` | Add throwing sources |
| `src/components/practice/ThrowingRepFields.tsx` | New — throwing-specific fields |
| `src/components/practice/RepScorer.tsx` | Add throwing rendering, hitting advanced fields |
| `src/components/practice/BaserunningRepFields.tsx` | Sport-aware drills, goal of rep |
| `src/components/practice/GameScorecard.tsx` | Major rewrite — personal scoring page with innings, advanced toggles, multi-module |
| `src/pages/PracticeHub.tsx` | Game scorecard for all modules, pass sport/profile info, baserunning target reps |
| `src/data/baseball/leagueDistances.ts` | New — standard distances by level |
| `src/data/softball/leagueDistances.ts` | New — standard distances by level |
| `src/components/practice/SessionConfigPanel.tsx` | League level selector, auto-populate distances |

