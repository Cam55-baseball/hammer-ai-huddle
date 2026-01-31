
# Implementation Plan: Updated Hitting Mechanics Feedback

## Summary

Update the AI analysis prompts for baseball and softball hitting to correctly implement the **Foot → Hips → Back Elbow → Hands** kinetic chain with accurate error detection and kid-friendly feedback language.

---

## Confirmed Hitting Mechanics

### Correct Kinetic Chain Sequence
1. **Front foot lands and stabilizes** (ground connection)
2. **Hips rotate toward ball** while chest stays facing home plate (core tension/separation)
3. **Back elbow drives forward**, extending past the belly button toward the pitcher
4. **Hands stay back** (near back shoulder, behind the elbow) until the last moment
5. **Shoulders finally open** AFTER the back elbow passes the belly button
6. **Bat whips through** to contact

### Key Errors to Detect (Priority Order)
| Priority | Error | Visual Cue |
|----------|-------|------------|
| #1 | Shoulders opening too early | Chest/jersey logo turns toward pitcher before elbow extends |
| #2 | Hands drifting forward | Hands move forward with stride instead of staying loaded |
| #3 | Back elbow staying tucked | Back elbow stays at side instead of driving forward past belly button |

### Correct Mechanics Visual Cues
- Chest facing home plate during hip rotation
- Hands staying loaded near back shoulder
- Visible hip-shoulder separation angle
- Back elbow visibly extending forward past hip line

---

## Files to Update

| File | Purpose |
|------|---------|
| `supabase/functions/analyze-video/index.ts` | Full video analysis hitting prompt |
| `supabase/functions/analyze-realtime-playback/index.ts` | Real-time analysis hitting prompt |

---

## Detailed Changes

### Change 1: Update the Kinetic Sequence Section

**Current prompt shows:**
```
CRITICAL HITTING KINETIC SEQUENCE:
1. Ground Force
2. Legs Drive
3. BACK ELBOW TRAVELS FORWARD (BEFORE hips rotate) ⭐
4. FRONT FOOT LANDS & STABILIZES...
5. Hips Rotate...
6. Torso Rotates
7. Shoulders Rotate...
8. Hands/Bat Release...
```

**Updated to:**
```
CORRECT HITTING KINETIC CHAIN (FOOT → HIPS → BACK ELBOW → HANDS):

1. FRONT FOOT LANDS & STABILIZES (ground connection) ⭐⭐⭐
2. HIPS ROTATE toward ball WHILE:
   - Chest stays facing home plate (creates core tension/separation) ⭐⭐
   - Back elbow begins driving forward
3. BACK ELBOW DRIVES FORWARD past the belly button toward the pitcher ⭐⭐
4. HANDS STAY BACK (near back shoulder, behind the elbow) until the last moment ⭐
5. SHOULDERS FINALLY OPEN (ONLY AFTER back elbow passes belly button) ⭐⭐⭐
6. BAT WHIPS through to contact

KEY SEPARATION CONCEPT:
- While hips rotate, the chest STAYS FACING HOME PLATE
- This hip-shoulder separation creates the torque/power
- The back elbow leads the hands forward
- Hands trail behind the elbow creating a "whip" effect
```

### Change 2: Update Red Flags Section

**Replace current RED FLAGS with:**
```
RED FLAGS TO IDENTIFY (in priority order):

⚠️ #1 PRIORITY - SHOULDERS OPENING TOO EARLY ⭐⭐⭐
- Chest/jersey logo turns toward pitcher BEFORE back elbow extends past belly button
- This is the most common power-killing mistake
- Destroys bat speed and adjustability
- Visual cue: Can you see the front of their jersey before the elbow extends?

⚠️ #2 - HANDS DRIFTING FORWARD ⭐⭐
- Hands move forward with the stride/body instead of staying loaded
- Should stay near back shoulder until the last moment
- Kills the "whip" effect that creates bat speed
- Visual cue: Do the hands drift toward the pitcher during the stride?

⚠️ #3 - BACK ELBOW STAYING TUCKED ⭐⭐
- Back elbow stays pinned to the body instead of driving forward
- Should extend past the belly button toward the pitcher
- Limits extension and power
- Visual cue: Does the back elbow stay at the hitter's side or drive forward?
```

### Change 3: Update Focus Checklist

**Replace the current "Focus on:" list with:**
```
Focus on (in this order):
1. ⭐⭐⭐ Is the FRONT FOOT PLANTED before ANY hip rotation begins? (CRITICAL - ground connection)
2. ⭐⭐⭐ Does the CHEST STAY FACING HOME PLATE while the hips rotate? (CRITICAL - separation)
3. ⭐⭐⭐ Do the SHOULDERS stay closed until AFTER the back elbow passes the belly button? (CRITICAL - #1 error)
4. ⭐⭐ Does the BACK ELBOW DRIVE FORWARD past the belly button toward the pitcher?
5. ⭐⭐ Do the HANDS STAY BACK (near back shoulder, behind elbow) until the last moment?
6. ⭐ Is the head stable (not drifting laterally toward pitcher during swing)?
7. Is the timing sequence correct (foot → hips → back elbow → hands)?
```

### Change 4: Update Positive Feedback Examples

**Add correct positive feedback patterns:**
```
POSITIVE FEEDBACK EXAMPLES (use these patterns):
- "Great hip-shoulder separation - your hips fired while your chest stayed facing home plate"
- "Your back elbow drove through past your belly button - excellent extension"
- "Hands stayed back until the last moment - great bat whip"
- "Perfect sequence: foot planted, hips rotated, elbow led the hands"
- "Your chest stayed home while your hips opened - that's where power comes from"
```

### Change 5: Update Correction Phrases

**Add correct correction patterns:**
```
CORRECTION FEEDBACK EXAMPLES (use these patterns):
- "Your shoulders started turning before your hips finished rotating"
- "Let your back elbow lead toward the ball - drive it past your belly button"
- "Your hands moved forward with your body - keep them back longer to create bat speed"
- "Your chest opened toward the pitcher too soon - keep it facing home plate longer"
- "Your back elbow stayed tucked - extend it forward past your belly button"
```

### Change 6: Update Forbidden Language Section

**Strengthen the "NEVER SAY" section:**
```
⛔⛔⛔ NEVER SAY FOR HITTING ⛔⛔⛔

These phrases are WRONG for hitting and must NEVER appear:

WRONG (direction/alignment focus):
- "back hip isn't pointing to the pitcher" ✗
- "back hip not facing the target" ✗
- "shoulders are not aimed correctly" ✗
- "shoulders not aligned with target" ✗
- "rotate your shoulders toward the ball" ✗
- "front elbow leads" ✗ (it's the BACK elbow that leads)

WRONG (outdated sequence):
- "shoulders start the swing" ✗
- "start with your shoulders" ✗
- "lead with your front elbow" ✗

CORRECT (timing/sequence focus):
- "Your shoulders started turning too early" ✓
- "Keep your chest facing home plate while your hips turn" ✓
- "Drive your back elbow past your belly button" ✓
- "Keep your hands back - let them whip the bat through" ✓
```

### Change 7: Update Kid-Friendly Language Examples

**Replace existing examples with:**
```
USE VISUAL, SIMPLE DESCRIPTIONS:

Instead of: "Early shoulder rotation"
Say: "Your chest turned toward the pitcher before your elbow moved forward - keep your chest facing home plate longer"

Instead of: "Lack of hip-shoulder separation"
Say: "Your shoulders and hips turned together - let your hips go first while your chest stays home"

Instead of: "Back elbow not extending"
Say: "Your back elbow stayed stuck at your side - push it forward past your belly button toward the pitcher"

Instead of: "Hands casting forward"
Say: "Your hands moved forward too soon - keep them back near your shoulder until the last second"

Instead of: "Proper kinetic chain"
Say: "Great order: foot down, hips turn, elbow drives, then hands whip the bat"
```

### Change 8: Update Scoring Criteria

**Update score caps to reflect new priorities:**
```
SCORE CAPS (NON-NEGOTIABLE):
- If shoulders open BEFORE back elbow passes belly button → MAX SCORE: 70 (or 7.0)
- If chest opens toward pitcher before hips finish rotating → MAX SCORE: 70 (or 7.0)
- If hands drift forward during stride/load → MAX SCORE: 75 (or 7.5)
- If back elbow stays tucked (doesn't extend forward) → MAX SCORE: 75 (or 7.5)
- If TWO OR MORE critical violations → MAX SCORE: 60 (or 6.0)
```

### Change 9: Update Summary Format Examples

**Replace hitting summary examples:**
```
HITTING SUMMARY EXAMPLES:
Good feedback bullets:
- "Keep your chest facing home plate while your hips turn - this creates power"
- "Drive your back elbow forward past your belly button"
- "Great separation - hips fired while chest stayed home"
- "Hands stayed back - nice bat whip at the end"
- "Your shoulders opened too early - wait for your elbow to extend first"

Bad feedback bullets (NEVER USE):
- "Your back hip isn't pointing to the pitcher when you land" ✗
- "Your shoulders are not aimed correctly" ✗
- "Rotate your shoulders toward the ball" ✗
```

---

## Validation Checklist

After implementation, the AI should:

| Check | Expected Behavior |
|-------|-------------------|
| Foot → Hips → Back Elbow → Hands sequence | AI describes this specific order |
| Hip-shoulder separation | AI mentions chest facing home plate during hip rotation |
| Back elbow cue | AI references back elbow driving past belly button |
| Hands staying back | AI notes hands staying near back shoulder |
| Shoulder timing trigger | AI says shoulders open AFTER elbow passes belly button |
| Never use alignment language | No "pointing at", "aimed at", "facing target" for hitting |
| Priority error detection | Shoulders opening early is flagged as #1 issue |

---

## Testing Approach

After deployment, test with a hitting video to verify:
1. The feedback uses the correct kinetic chain language
2. No pitching-style alignment phrases appear
3. Back elbow and belly button cues are present
4. Hip-shoulder separation is correctly described
5. Score caps reflect the new priority errors

