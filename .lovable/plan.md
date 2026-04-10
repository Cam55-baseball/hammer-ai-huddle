

# Fix Drill Instruction System — Full Population + Quality Enforcement

## Problem
All 88 active drills have `instructions = null`. The current fallback generates useless content like "Standard drill setup". No drill is field-ready.

## Plan

### 1. Create `populate-drill-instructions` Edge Function (NEW)
**File: `supabase/functions/populate-drill-instructions/index.ts`**

A batch endpoint that:
- Fetches drills where `instructions IS NULL` (or all drills if `force=true`)
- Processes them in batches of 5 via the AI gateway
- For each drill, sends name + description + skill_target + module + sport to AI with a strict schema requiring:
  - `purpose`: WHY this drill matters in a game context
  - `setup`: distance, equipment, starting position, reps
  - `execution`: minimum 5 numbered steps with exact body mechanics
  - `coaching_cues`: 3+ short real-time cues
  - `mistakes`: 3+ specific bad habits
  - `progression`: 3+ ways to increase difficulty
- Validates output (rejects if execution < 4 steps or setup lacks distance/equipment)
- Writes validated instructions directly to the `drills.instructions` JSONB column
- Returns count of updated drills
- Protected by `Owner_Key` header check so only you can trigger it

### 2. Update `generate-drills` Edge Function
**File: `supabase/functions/generate-drills/index.ts`**

Add `instructions` to the tool schema so all NEW drills are generated with full instructions from the start:
```
instructions: {
  type: "object",
  properties: {
    purpose: { type: "string" },
    setup: { type: "string" },
    execution: { type: "array", items: { type: "string" }, minItems: 4 },
    coaching_cues: { type: "array", items: { type: "string" }, minItems: 3 },
    mistakes: { type: "array", items: { type: "string" }, minItems: 3 },
    progression: { type: "array", items: { type: "string" }, minItems: 3 }
  },
  required: ["purpose", "setup", "execution", "coaching_cues", "mistakes", "progression"]
}
```

Update the system prompt to enforce actionable content (no vague phrases). Include `instructions` in the insert payload for both auto and manual modes.

### 3. Fix `DrillDetailDialog` Fallback
**File: `src/components/practice/DrillDetailDialog.tsx`**

Replace the current weak fallback (lines 37-45) with a smarter one:
- If `instructions` exists and has real content → use it
- If `instructions` is null → show ONLY the description paragraph (no fake "Standard drill setup")
- Remove the fallback that generates fake instruction objects from description text

This ensures no misleading content is shown. Once the population script runs, all drills will have real instructions.

### 4. Run Population Script
After the edge function deploys, invoke it to populate all 88 drills with AI-generated, field-ready instructions. This will be done via a `curl` call to the deployed function with the Owner_Key.

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/populate-drill-instructions/index.ts` | NEW — batch AI instruction generator |
| `supabase/functions/generate-drills/index.ts` | Add `instructions` to schema + insert |
| `src/components/practice/DrillDetailDialog.tsx` | Remove weak fallback, show description only when no instructions |

## Technical Details

- AI model: `google/gemini-2.5-flash` (good balance of quality and speed for 88 drills)
- Batch size: 5 drills per AI call to stay within token limits
- Validation: reject any instruction where `execution.length < 4` or setup doesn't mention distance/equipment
- The system prompt will explicitly ban vague phrases ("work on", "focus on", "improve") and require exact distances, equipment, body positions
- Owner_Key authentication prevents unauthorized access

