

# Speed Lab: Multi-Rep Sprint System, Barefoot Progression, and Game-Ready Conditioning

## What This Changes

This upgrade transforms the Speed Lab from a single-time-per-distance logger into a full game-ready conditioning system. Athletes will see exactly how many sprints to run at each distance, log every individual rep with its own timer, and progressively build toward 16 full-out sprints per session (the game standard for both MLB and AUSL). Barefoot training will be introduced gradually based on session progression and readiness, with clear explanations of why it matters for development.

---

## 1. Sprint Rep Progression System

Sprint reps will start low and build progressively, with the system auto-adjusting based on readiness:

| Session Range | 10Y / 7Y Reps | 30Y / 20Y Reps | 60Y / 40Y Reps | Total Sprints |
|---------------|----------------|-----------------|-----------------|---------------|
| Sessions 1-3  | 2              | 1               | 1               | 4             |
| Sessions 4-6  | 3              | 2               | 1               | 6             |
| Sessions 7-9  | 3              | 2               | 2               | 7             |
| Sessions 10-14| 4              | 3               | 2               | 9             |
| Sessions 15-19| 4              | 3               | 3               | 10            |
| Sessions 20-24| 5              | 4               | 3               | 12            |
| Sessions 25+  | 6              | 5               | 5               | 16            |

**Readiness auto-adjustment**: If the readiness score (calculated from sleep, body feel, and pain areas) falls below 40, reps are cut by ~40%. If below 60, reps are cut by ~25%. The UI will explain: "Your body is recovering today. We've adjusted your sprint count."

---

## 2. Multi-Rep Time Logging

**Current**: One time per distance (e.g., `{ "10y": 1.85 }`)

**New**: Array of times per distance (e.g., `{ "10y": [1.85, 1.82, 1.79] }`)

Each distance card in the sprint logging step will show Rep 1, Rep 2, Rep 3, etc. with:
- Individual number inputs or partner timer per rep
- Best time highlighted with a star icon
- PB comparison shown next to each rep
- The best time from the array becomes the new PB candidate

The database `distances` column is already JSONB, so it can store arrays without a schema migration. The code will detect both formats (number for old sessions, array for new ones) for backward compatibility.

---

## 3. "Run Your Sprints" Page Redesign

The `SpeedSprintStep.tsx` component will be completely redesigned:

- **Distance cards** show the assigned rep count for the session (e.g., "10 Yard Sprint -- 3 reps")
- **Rest guidance** between sprints: "Walk back slowly. Rest 2-3 minutes. Sprint only when fully ready."
- **Readiness adjustment notice**: If reps were reduced, a banner explains why
- **Button text** changes from "I'm Done Sprinting" to **"Begin Sprinting"** (since they log times on the next page)
- **Barefoot indicator**: Sessions that include barefoot sprints will show a barefoot badge on the relevant distance

---

## 4. Barefoot Progression

Barefoot training stages based on session number AND readiness:

| Stage | Sessions | What Changes |
|-------|----------|-------------|
| Foundation | 1-9 | Barefoot activation drills only (ankle circles, toe grips) -- already in place |
| Introduction | 10-14 | Add barefoot A-skips and ankling drills (marked with barefoot badge) |
| Integration | 15-19 | Introduce barefoot 10Y sprint option (shortest distance only) |
| Advanced | 20+ | All short-distance sprints can be done barefoot; readiness must be above 60 |

A new `barefootLevel` field will be added to each drill in the data file. The UI will show a barefoot badge when relevant, and the drill description will explain WHY barefoot training matters for fascia development.

**Legal disclaimer** added to the bottom of every session flow page:
> "Barefoot training is introduced gradually to strengthen feet and connective tissue. Always train on safe, clean surfaces. If you experience pain, stop immediately and return to shoes. Consult a qualified professional before beginning any barefoot training program."

---

## 5. Game-Ready Conditioning Context

Both baseball and softball athletes train toward 16 full-out sprints -- the same UI framework, with sport-specific messaging:

- **Baseball**: "Train to sprint 16 times in a game. Full MLB season ready."
- **Softball**: "Train to sprint 16 times in a game. Full AUSL season ready."

A progress indicator on the sprint step shows: "You're at 9 of 16 game-ready sprints" with a progress bar.

---

## Technical Details

### Files Modified

| File | Changes |
|------|---------|
| `src/data/speedLabProgram.ts` | Add `getSprintRepsForSession()` function, `barefootLevel` field on DrillData, barefoot progression constants |
| `src/components/speed-lab/SpeedSprintStep.tsx` | Complete redesign: show rep counts per distance, readiness adjustment notice, game-ready progress bar, barefoot badges, "Begin Sprinting" button, barefoot disclaimer |
| `src/components/speed-lab/SpeedTimeEntry.tsx` | Multi-rep inputs: render Rep 1, Rep 2... per distance with individual timer/input, highlight best time, PB comparison |
| `src/components/speed-lab/PartnerTimer.tsx` | No structural changes needed (already works per-rep) |
| `src/components/speed-lab/SpeedSessionFlow.tsx` | Pass `sessionNumber` and `readinessScore` to SpeedSprintStep; update `distanceTimes` state to `Record<string, number[]>`; update PB detection to scan arrays; pass rep config down; add barefoot disclaimer to footer |
| `src/hooks/useSpeedProgress.ts` | Update `saveSession` and `updatePersonalBests` to handle `Record<string, number[]>` format; add backward compat for old `Record<string, number>` format in session history |
| `src/pages/SpeedLab.tsx` | Pass readiness data to session flow |
| `src/i18n/locales/en.json` | New keys: sprint rep labels, readiness adjustment messages, game-ready progress, barefoot badges, barefoot disclaimer |
| `src/i18n/locales/de.json` | Same new keys translated to German |
| `src/i18n/locales/es.json` | Same new keys translated to Spanish |
| `src/i18n/locales/fr.json` | Same new keys translated to French |
| `src/i18n/locales/ja.json` | Same new keys translated to Japanese |
| `src/i18n/locales/ko.json` | Same new keys translated to Korean |
| `src/i18n/locales/nl.json` | Same new keys translated to Dutch |
| `src/i18n/locales/zh.json` | Same new keys translated to Chinese |

### Data Structure Changes

**DrillData interface** (adding one field):
```text
interface DrillData {
  // ... existing fields
  barefootLevel?: number;  // 0 = never barefoot, 1 = barefoot after session 10, 2 = after 15, 3 = after 20
}
```

**Sprint rep config** (new function):
```text
getSprintRepsForSession(sessionNumber, readinessScore) -> { "10y": 3, "30y": 2, "60y": 1 }
```

**Distance times format change**:
```text
Before: { "10y": 1.85, "30y": 3.45 }
After:  { "10y": [1.85, 1.82, 1.79], "30y": [3.45, 3.50] }
```

### No Database Migration Required

The `distances` column is already JSONB, which handles both `number` and `number[]` values. The code will detect old format (plain numbers) and treat them as single-element arrays for backward compatibility. No schema change needed.

### Backward Compatibility

- Old sessions with `{ "10y": 1.85 }` format will display correctly in session history
- PB logic will handle both formats: if value is a number, use it directly; if array, use `Math.min(...arr)`
- No data migration needed

### Total: ~15 files modified, 0 database migrations

