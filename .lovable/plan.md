

## Plan — More Accurate Pro Anchors + Throwing Velo for Fielders

### Issue
Current pro-band 80 anchors don't reflect true MLB elite. Examples user gave:
- 10-yd dash: MLB elites hit ~1.3s; we cap pro 80 at **1.38s**.
- Long toss: MLB OFs throw 400'+; we cap pro 80 at **370 ft** (and registry max input is 400).

Also, `position_throw_velo` exists but is gated `tier: 'paid'` with only `modules: ['throwing']`, so position players (fielders) using free tier or general module don't see it.

### Files to change

| File | Change |
|------|--------|
| `src/data/gradeBenchmarks.ts` | Recalibrate pro-band 80 anchors (and adjust 65/55 pulls) for the speed + arm metrics below. Also extend college 80 where MLB-realistic. |
| `src/data/performanceTestRegistry.ts` | `position_throw_velo`: change `tier: 'paid'` → `'free'`, add `'general'` to modules, raise `max` to **105**. Raise `long_toss_distance` `max` from **400** → **450**. |

### Specific anchor recalibrations (pro band, baseball)

| Metric | Old 65 / 80 | New 65 / 80 | Rationale |
|---|---|---|---|
| `ten_yard_dash` | 1.47 / 1.38 | 1.40 / **1.30** | Elite MLB burners (Witt Jr. tier) |
| `thirty_yard_dash` | 3.5 / 3.3 | 3.45 / **3.20** | scales with 10yd |
| `sixty_yard_dash` | 6.4 / 6.2 | 6.3 / **6.0** | MLB combine elite ~6.1 |
| `long_toss_distance` | 320 / 370 | 360 / **420** | OF cannons 400'+ |
| `pitching_velocity` | 96 / 100 | 98 / **103** | Modern MLB elite (Skenes/Strider tier) |
| `position_throw_velo` | 92 / 98 | 95 / **102** | Witt Jr. SS throws ~98–100 |
| `pulldown_velocity` | (will check) | bumped +2-3 | Driveline elite |

Softball pro 80 anchors will get matched proportional bumps (10yd ~1.40, long toss ~310, pitching velo ~78).

College pro-bridge bands also nudged so the curve stays smooth (no cliffs).

### Behaviors preserved
- ✅ 45 = league average, 80 = elite — unchanged definition
- ✅ Piecewise linear interpolation continues to work (sorted points)
- ✅ Lower-bound (20) anchors unchanged — only the elite ceiling shifts
- ✅ No DB/migration changes; pure data file edits
- ✅ `position_throw_velo` becomes available to all position players regardless of module/tier

### Out of scope
- Power, hitting, fielding mechanics tables (no user complaint)
- Engine math, UI components, hooks

