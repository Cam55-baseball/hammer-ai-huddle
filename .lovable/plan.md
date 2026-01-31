

# Implementation Plan: Enhanced Hitting Feedback Variety & Holistic Swing Messaging

## Summary

Expand the AI feedback examples to include more variety around **back elbow extension** and **hands staying back**, while adding guidance to describe the swing as **one connected system** with diverse, non-repetitive language.

---

## What You're Asking For

1. **More talk about the elbow moving forward** - not just "hands rushing past elbow"
2. **More talk about hands staying back/loaded** - the loaded position is key
3. **Clear, focused messages that aren't monotonous** - vary the words
4. **Paint the whole swing as one system** - it all flows together
5. **Show what needs help** with a complete picture

---

## Files to Update

| File | Purpose |
|------|---------|
| `supabase/functions/analyze-video/index.ts` | Full video analysis hitting prompt |
| `supabase/functions/analyze-realtime-playback/index.ts` | Real-time analysis hitting prompt |

---

## Detailed Changes

### Change 1: Add "Whole Swing as One System" Guidance

Add a new section emphasizing the connected nature of the swing:

```
THE SWING IS ONE CONNECTED SYSTEM:
When giving feedback, paint the WHOLE picture - don't just focus on one body part:
- The swing flows: foot plants → hips fire → elbow drives → hands whip → bat releases
- If one part breaks down, it affects everything downstream
- When correcting, show HOW the parts connect:
  * "When your elbow drives forward, your hands naturally trail behind - that's the whip"
  * "Your hips started the chain perfectly, but the elbow didn't follow through"
  * "The foot was down, the hips were turning - now let's get that elbow leading the hands"

DON'T be repetitive with the same phrase. Describe what you SEE in that specific swing.
```

### Change 2: Expand Back Elbow Extension Examples

Add more variety for describing the elbow's role:

```
BACK ELBOW EXTENSION - VARIED PHRASES (use different ones each time):

POSITIVE (elbow doing it right):
- "Your back elbow led the way - it drove forward past your belly button"
- "Nice elbow extension - it reached out toward the pitcher before your hands"
- "The elbow fired first, and your hands followed perfectly"
- "Your elbow drove through the zone - that's what creates the whip"
- "Great elbow action - it extended forward and your hands snapped through"
- "The back elbow reached past your hip line - exactly right"

CORRECTION (elbow not extending):
- "Your elbow stayed stuck at your side - push it forward toward the pitcher"
- "The elbow needs to lead - drive it past your belly button before your hands go"
- "Your hands moved but your elbow didn't - let the elbow reach forward first"
- "I see your elbow pinned close to your body - extend it out toward the ball"
- "The elbow got left behind - it should be driving the hands forward"
- "Push that back elbow through - it creates the extension you need for power"
```

### Change 3: Expand Hands Staying Back Examples

Add more variety for describing hand position:

```
HANDS STAYING BACK/LOADED - VARIED PHRASES (use different ones each time):

POSITIVE (hands staying loaded):
- "Your hands stayed loaded by your shoulder - perfect patience"
- "Hands back until the last second - that's how you create bat speed"
- "I love how your hands waited - they didn't drift forward with your stride"
- "The hands stayed home while your hips did the work - great separation"
- "Your hands were patient, coiled, ready to explode - exactly right"
- "Hands near your back shoulder until the elbow drove - that's the sequence"

CORRECTION (hands drifting):
- "Your hands crept forward during your stride - keep them back by your shoulder"
- "The hands drifted toward the pitcher before they should have"
- "I see your hands moving forward with your body - let them stay loaded"
- "Keep those hands back - they should be the LAST thing to move"
- "Your hands left early - they should stay coiled until your elbow fires"
- "The hands jumped ahead - wait for your hips and elbow to lead first"
```

### Change 4: Add "Paint the Picture" Guidance

Add guidance on describing the whole swing holistically:

```
PAINT THE PICTURE - DESCRIBE WHAT YOU SEE:

Don't just say "hands rushed forward" every time. Describe the FLOW of what happened:

WHOLE-SWING DESCRIPTIONS (examples):
- "Your foot landed solid, hips fired beautifully, but then the elbow stayed back and the hands had to do all the work - let that elbow drive through"
- "Great setup and stride, but everything fired at once - let your hips go first, then elbow, then hands"
- "The chain started right - foot down, hips turning - but your chest opened before your elbow could lead the hands"
- "I see good pieces: solid foot plant, nice hip turn. Now we need the elbow to extend forward before the hands release"
- "Your stride was smooth and your hips started turning, but your hands went with them instead of staying back"

VARY YOUR LANGUAGE - Don't repeat the same correction twice:
- First mention: "Your hands drifted forward during the stride"
- If mentioning again: "Keep those hands loaded back by your shoulder"
- If reinforcing: "Let your hips and elbow lead - the hands should be last"
```

### Change 5: Update Summary Format Examples

Replace with more varied, system-focused examples:

```
HITTING SUMMARY EXAMPLES (varied, holistic language):

Good summary bullets that paint the whole picture:
- "Foot planted, hips fired, elbow led the hands - great sequence"
- "Your hips started the chain but your elbow stayed tucked - push it forward"
- "Hands stayed loaded until the elbow drove through - nice bat whip"
- "The stride was smooth but your chest opened before your elbow could lead"
- "I like the hip turn - now let your back elbow extend past your belly button"
- "Your hands crept forward during stride - keep them coiled back"
- "Great separation: hips rotated while chest stayed facing home plate"
- "The elbow reached forward and your hands snapped through - that's the whip"

AVOID monotonous repetition like:
- "Hands rushed forward" (again and again)
- Same exact phrase for every swing
- Only mentioning one body part without context

INSTEAD, show how parts connect:
- "Your hips did the work but your hands left early - let them wait for the elbow"
```

---

## Technical Updates

Both edge function files will be updated in the same locations:
1. After the "CORRECTION FEEDBACK EXAMPLES" section
2. Before the "RULES:" section

The changes add approximately 50 lines of additional guidance for feedback variety.

---

## Validation Checklist

After implementation, the AI should:

| Check | Expected Behavior |
|-------|-------------------|
| Elbow extension language | Uses varied phrases about elbow driving forward |
| Hands staying back language | Uses varied phrases about hands staying loaded |
| Whole-swing descriptions | Connects multiple body parts in feedback |
| No monotonous repetition | Different phrasing for similar corrections |
| Paints the picture | Describes what was seen in that specific swing |
| System thinking | Shows how parts affect each other |

