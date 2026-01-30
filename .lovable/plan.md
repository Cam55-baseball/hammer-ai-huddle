

# Improvement Plan: Kid-Friendly, Contradiction-Free Analysis Feedback

## Problem Summary

The AI analysis system currently has two issues:

1. **Contradictions**: The analysis sometimes says something is good in one section (positives) but needs improvement in another section (summary/feedback)
2. **Unclear terminology**: Instructions like "Ensure your glove always faces the target for direction" are confusing - what part of the glove? Which direction?

## Root Cause

The system prompts in two edge functions send instructions to the AI but don't:
- Explicitly require consistency checking between positives and improvement areas
- Provide kid-friendly language guidelines with specific examples
- Define terminology in plain, visual language a 10-year-old could understand

## Files to Update

| File | Purpose |
|------|---------|
| `supabase/functions/analyze-video/index.ts` | Main video analysis function |
| `supabase/functions/analyze-realtime-playback/index.ts` | Real-time analysis function |

## Changes

### 1. Add Contradiction Prevention Instructions

Add explicit instructions to ALL system prompts requiring the AI to:
- Cross-check positives against summary/feedback before returning
- Never list the same element as both a strength AND an improvement area
- If something is "mostly good but needs minor work," put it in improvements only

**Example instruction to add:**
```
CONSISTENCY REQUIREMENT - NO CONTRADICTIONS:
Before finalizing your response, cross-check your positives against your summary and feedback:
- If you list something as a POSITIVE, you CANNOT also say it needs improvement
- If you identify something that needs work, it should NOT appear in positives
- Example of what NOT to do: Positive says "Good shoulder alignment" but summary says "Work on shoulder alignment"
- If a skill is partially correct, list it under improvements with acknowledgment of what's working
```

### 2. Add Kid-Friendly Language Guidelines

Add a section requiring all feedback to be written so a 10-year-old who has never played baseball/softball can understand. Include specific terminology translations:

**Example terminology guide to add:**
```
LANGUAGE REQUIREMENT - UNDERSTANDABLE BY 10-YEAR-OLDS:
Write all feedback so a child who has never played the sport can understand.

USE VISUAL, SIMPLE DESCRIPTIONS:
Instead of: "Ensure your glove always faces the target"
Say: "Point the open pocket of your glove (the part where you catch the ball) toward home plate"

Instead of: "Shoulders aligned with target at landing"  
Say: "When your front foot touches the ground, your chest and belly button should point toward home plate"

Instead of: "Back leg facing target"
Say: "Your back knee (the one you push off from) should point toward home plate when you land"

Instead of: "Early shoulder rotation"
Say: "Your shoulders started turning before your front foot touched the ground - wait for your foot to land first"

Instead of: "Kinetic chain"
Say: "The order your body parts move - feet first, then hips, then shoulders"

Instead of: "Power line"
Say: "An imaginary straight line from where you start to home plate"

RULES:
1. No technical jargon without immediate explanation
2. Use body parts everyone knows (knee, belly button, chest, foot)
3. Use "home plate" or "where you're throwing/hitting to" instead of "target"
4. Describe positions like you're giving directions to a friend
5. Keep sentences under 15 words when possible
```

### 3. Update Summary Format Instructions

Update the existing summary format sections to reinforce these requirements and add examples of good kid-friendly language.

### 4. Update Positives Instructions

Add a note that positives must use the same kid-friendly language and must not contradict any improvement areas.

## Implementation Details

### File 1: `supabase/functions/analyze-video/index.ts`

**Locations to update:**
- Hitting system prompt (lines ~148-335): Add consistency and language requirements
- Baseball pitching system prompt (lines ~338-512): Add consistency and language requirements  
- Softball pitching system prompt (lines ~515-710): Add consistency and language requirements
- Throwing system prompt (lines ~713-886): Add consistency and language requirements

For each module prompt, insert the two new instruction blocks:
1. Contradiction prevention (after existing RED FLAGS section)
2. Kid-friendly language guide (before SUMMARY FORMAT section)

### File 2: `supabase/functions/analyze-realtime-playback/index.ts`

**Locations to update:**
- All module-specific prompts in `getSystemPrompt()` function
- Same two instruction blocks as above

## Expected Outcome

After implementation:
- A 10-year-old reading "Point the open pocket of your glove toward home plate" will understand what to do
- Parents who don't know baseball terminology can help their kids with the feedback
- The positives section will never contradict the improvement suggestions
- All terminology will be explained in plain, visual language

## Summary of Changes

| Change | Description |
|--------|-------------|
| Add contradiction prevention | Explicit instruction requiring cross-check before response |
| Add kid-friendly language guide | Terminology translations with simple, visual descriptions |
| Update summary examples | Replace jargon-heavy examples with kid-friendly versions |
| Update positives instructions | Require same language standards and no contradictions |

