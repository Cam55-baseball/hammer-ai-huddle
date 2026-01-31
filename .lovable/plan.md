

# Implementation Plan: Tighten Throwing Feedback Language for Clarity

## Summary

Fix confusing phrasing in the throwing module's SUMMARY FORMAT and visual description examples. The current wording is misleading or awkwardly structured - we need language that is unmistakable and reads naturally.

---

## The Problem

**Current confusing phrases:**
- "Turn your shoulders after your front foot hits the ground" - reads like a command to turn NOW
- "Point your front shoulder at your target when your foot lands" - unclear timing
- "Wait for your chest to stay sideways until your foot is down" - grammatically awkward, confusing

**Your preferred phrasing:**
- "Allow your shoulders to turn after your front foot hits the ground"
- "Keep your front shoulder pointed at your target when your foot lands"
- "Have your chest stay sideways and wait until your foot is down to let it go"

---

## Files to Update

| File | Purpose |
|------|---------|
| `supabase/functions/analyze-video/index.ts` | Full video analysis throwing prompt |
| `supabase/functions/analyze-realtime-playback/index.ts` | Real-time analysis throwing prompt |

---

## Detailed Changes

### Change 1: Update SUMMARY FORMAT Examples (analyze-video)

**Location**: Lines ~1129-1141

**Current (confusing):**
```
- "Land your front foot before turning - this gives you power and accuracy"
- "Your shoulders started turning too early - wait for your foot to land first"
- "Great timing - your foot lands, then your body turns together"
- "Stay sideways longer - point your front shoulder at your target when you land"
- "Your chest turned too early - keep it facing the side until your foot is down"
```

**Updated (clear and unmistakable):**
```
- "Allow your shoulders to turn only after your front foot hits the ground - this gives you power"
- "Your shoulders started turning before your foot landed - wait for that foot to plant first"
- "Great timing - your foot landed and then your body turned together"
- "Keep your front shoulder pointed at your target when your foot lands - stay sideways longer"
- "Have your chest stay sideways until your foot is down, then let it turn"
- "Your chest was already facing your target when your foot landed - keep it closed longer"
```

### Change 2: Update Visual Description Examples (analyze-video)

**Location**: Lines ~1103-1121

**Current:**
```
Instead of: "Shoulders begin rotating before stride foot lands"
Say: "Your shoulders started turning before your front foot touched the ground - wait for your foot to land first"

Instead of: "Chest was already facing target at landing" (EARLY ROTATION)
Say: "When your foot landed, your chest was already facing where you're throwing - stay sideways longer! Point your front shoulder at your target, and only turn your chest AFTER your foot lands"

Instead of: "Shoulders should be lateral at landing"
Say: "When your front foot lands, your front shoulder (glove side) should point straight at your target like an arrow - your chest should face the side, not your target yet"
```

**Updated (tighter, clearer):**
```
Instead of: "Shoulders begin rotating before stride foot lands"
Say: "Your shoulders started turning before your front foot touched the ground - allow your shoulders to turn only after your foot lands"

Instead of: "Chest was already facing target at landing" (EARLY ROTATION)
Say: "When your foot landed, your chest was already facing your target - keep your chest sideways until your foot is down, then let it turn"

Instead of: "Shoulders should be lateral at landing"
Say: "Keep your front shoulder pointed at your target when your foot lands - your chest should stay facing the side, not your target yet"
```

### Change 3: Mirror Changes in analyze-realtime-playback

**Location**: Lines ~851-865

Apply the same language updates to ensure consistency across both analysis functions.

---

## Language Philosophy Applied

The key difference is in the **verb structure**:

| Confusing (command style) | Clear (descriptive/permissive style) |
|---------------------------|--------------------------------------|
| "Turn your shoulders after..." | "Allow your shoulders to turn after..." |
| "Point your front shoulder..." | "Keep your front shoulder pointed..." |
| "Wait for your chest to stay..." | "Have your chest stay... then let it..." |
| "Stay sideways longer" | "Keep your chest sideways until..." |

**Why this matters:**
- "Turn" sounds like "do it now" - but we mean "wait for this to happen"
- "Keep...pointed" is a maintained position, not a new action
- "Allow...to turn" implies the turn is a result of proper timing, not a forced action
- "Let it go" is a clear release cue after the condition is met

---

## Validation Checklist

After implementation, throwing feedback should:

| Check | Expected Behavior |
|-------|-------------------|
| Shoulder timing cues | Use "allow to turn" not "turn" |
| Chest position cues | Use "keep...stay...then let" structure |
| Front shoulder cues | Use "keep...pointed" not "point" |
| No grammatical awkwardness | Every sentence reads naturally |
| Unmistakable meaning | Reader cannot misinterpret the cue |

