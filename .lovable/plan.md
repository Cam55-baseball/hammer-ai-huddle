

# Speed Lab Audit -- Elite-Level Improvements

## Issues Found

After a deep audit of every file, database table, RLS policy, hook, and component, here is a comprehensive list of problems and missing pieces that need to be addressed to bring Speed Lab to a true .01% standard.

---

## Issue 1: Drills Have NO Kid-Friendly Descriptions (Critical)

The single biggest gap. The `DrillData` interface only has `name`, `cues`, and `setsReps`. There is NO `description` field. This means a 10-year-old sees:

```
ISO Split Squat Hold
Cues: "Back knee off ground" | "Stay tall"
Sets: 8 sec each side
```

They have no idea what this exercise IS, what muscles it works, WHY they're doing it, or HOW it helps them get faster. This violates the app's core design principle of kid-friendly, unmistakable feedback.

### Fix
Add a `description` field to `DrillData` with a plain-English, kid-friendly explanation for every single drill (~35 drills). Also add a `whyItHelps` field that connects the drill to speed in one sentence (fascia-integrated reasoning).

Example transformation:
- **Before**: `"ISO Split Squat Hold"` -- cues: `"Back knee off ground", "Stay tall"` -- `8 sec each side`
- **After**: `"ISO Split Squat Hold"` -- **"Stand in a lunge position and hold still. Keep your back knee just off the ground and your chest tall. This makes your legs strong in the position you use when you sprint."** -- Why it helps: **"Strong legs in the sprint position = faster starts."**

---

## Issue 2: No Sprint Instruction Step in Session Flow (Critical)

The session flow goes: Check-In -> Focus -> Drills -> Log Results. But there is NO step that tells the user **"Now go run your sprints!"**. The drill cards include sprint mechanics drills (wall drives, falling starts, etc.), but after completing those drills, users jump straight to "Log Your Times" with no instruction explaining that they need to actually go outside and run their timed distances (10Y, 30Y, 60Y).

A kid would complete the drills, then see "Log Your Times -- Enter your sprint times in seconds" and wonder: "Wait, was I supposed to run somewhere? When? Which distances?"

### Fix
Add an explicit **"Run Your Sprints"** step between the Drills step and the Log Results step. This step should:
- Show the exact distances they need to run (sport-specific)
- Explain the process: "Find a flat open space. Mark your distances. Sprint ALL OUT. Rest 2-3 minutes between sprints."
- Include Partner Mode instructions: "Have someone tap START when you go and STOP when you finish"
- Make it clear which distances are optional vs required (all are optional -- if they only run the 10Y, that's fine)

---

## Issue 3: Partner Timer Results Not Saved to Database (Bug)

The `savePartnerTiming` function exists in `useSpeedProgress.ts` and is returned from the hook, but it is NEVER CALLED anywhere in the UI. The `PartnerTimer` component calls `onComplete` which just sets the numeric value in the time entry field. The partner timing data (who timed it, when, etc.) is never persisted to `speed_partner_timings`.

### Fix
Wire `savePartnerTiming` into the session completion flow. When Partner Mode is used, record whether each distance was timed by 'self' or 'partner' and save that metadata after the session is saved.

---

## Issue 4: `refreshKey` State is Unused (Bug)

In `SpeedLab.tsx`, `refreshKey` is set when the countdown timer completes, but it's never used as a dependency anywhere. This means the page doesn't actually refresh or re-fetch data when the lock expires. The user would need to manually navigate away and back.

### Fix
Pass `refreshKey` as a dependency to trigger `fetchData()` when the countdown completes, or call `fetchData()` directly in the `onComplete` callback.

---

## Issue 5: `updated_at` Trigger Missing on `speed_goals` Table

The `speed_goals` table has an `updated_at` column, and the code updates it manually via `.update()`. However, there is no database trigger to automatically set `updated_at = now()` on UPDATE like other tables in the app use (the `update_updated_at_column` trigger function exists but is not attached to `speed_goals`).

### Fix
Add the `update_updated_at_column` trigger to `speed_goals`.

---

## Issue 6: Session Focus Messages Not Translatable

The `SESSION_FOCUSES` array in `speedLabProgram.ts` contains hardcoded English strings:
```
{ icon: '⚡', message: 'Today we build explosive first steps.' }
```

These are displayed directly in the UI without using the `t()` translation function. Non-English users will always see English focus messages.

### Fix
Convert focus messages to use translation keys. Store only `icon` and a `messageKey` in the data file, then resolve the translation in the component using `t()`.

---

## Issue 7: Drill Names and Cues Not Translatable

All 35 drill names and their cues are hardcoded in English in `speedLabProgram.ts`. Example:
```
name: 'Barefoot Ankle Circles + Toe Grips'
cues: ['Slow circles', 'Grip the ground with toes']
```

For non-English users, these will always appear in English even though the rest of the UI is localized.

### Fix
Add drill translation keys to the locale files and resolve them in `SpeedDrillCard.tsx` using the drill ID as a key prefix: `t('speedLab.drills.ankle_circles.name')`, `t('speedLab.drills.ankle_circles.description')`, etc. Use the English text as fallback.

---

## Issue 8: RPE Slider Accessibility on Mobile

The RPE slider uses a Radix `Slider` component with values 1-10. For kids on phones, a slider with 10 notches on a narrow screen is very hard to hit accurately. A 5-year-old cannot reliably slide to exactly "7" on a tiny slider.

### Fix
Replace the slider with large tappable number buttons (1-10) or segmented emoji-based options. Each number should be its own large button (minimum 44x44px) with a color indicator and simple label.

---

## Summary of All Changes

| Priority | Issue | Files Affected |
|----------|-------|----------------|
| Critical | Add descriptions + whyItHelps to all drills | `speedLabProgram.ts`, `SpeedDrillCard.tsx`, `DrillData` interface |
| Critical | Add "Run Your Sprints" step to session flow | `SpeedSessionFlow.tsx`, locale files |
| Bug | Wire savePartnerTiming to session completion | `SpeedSessionFlow.tsx`, `SpeedLab.tsx` |
| Bug | Fix refreshKey to actually trigger data refresh | `SpeedLab.tsx` |
| Bug | Add updated_at trigger to speed_goals | Database migration |
| UX | Make session focus messages translatable | `speedLabProgram.ts`, `SpeedFocusCard.tsx`, locale files |
| UX | Make drill names/cues translatable | `SpeedDrillCard.tsx`, locale files |
| UX | Replace RPE slider with tappable buttons | `SpeedRPESlider.tsx` |

### Technical Details

**DrillData interface changes:**
```text
Current:  { id, name, category, cues, setsReps, duration?, minSessionNumber? }
Proposed: { id, name, category, cues, setsReps, duration?, minSessionNumber?, description, whyItHelps }
```

**Session flow step changes:**
```text
Current:  checkin -> focus -> drills -> log_results -> complete
Proposed: checkin -> focus -> drills -> sprint_efforts -> log_results -> complete
```

The new `sprint_efforts` step will show:
- Distance cards for each sprint (e.g., "10 Yard Sprint")
- Clear instruction: "Sprint as fast as you can!"
- Rest timer suggestion: "Rest 2-3 minutes between sprints"
- Partner timer integrated directly into each distance card
- "Skip" option if a distance is not run that day
- After all sprints, transition to log_results for RPE + body feel

**Database migration:**
- Attach `update_updated_at_column` trigger to `speed_goals`

**Locale changes:**
- Add ~35 drill description + whyItHelps keys per language
- Add sprint instruction step translation keys
- Add focus message translation keys (7 messages)
- Total: ~80 new keys per locale file (8 files)

