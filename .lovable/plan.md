
# Stronger Health Tips, Mind Fuel Messages & Better Vitamin/Mineral Tracking

## Current State Assessment

### Health Tips (515 tips in DB)
- The current tips are **generic and low-specificity** — e.g., "Type A athletes often thrive on plant-based proteins like lentils, beans, and tofu" — this is speculative pseudoscience (blood-type diets are scientifically unsupported). The category `blood_type` alone fills the first 20 rows.
- The AI generation prompt is a short one-liner: "1-3 sentences maximum. Actionable." — no depth requirement, no scientific grounding instruction, no elite athlete framing.
- The daily limit is **2 tips per day** — enough to maintain the habit but the quality ceiling is low.

### Mind Fuel Messages (257 lessons in DB)
- Content is solid (quotes from proven coaches, mantras, principles) but the AI generation prompt currently produces surface-level content: "keep it to 1-3 sentences maximum" with no instruction to tie it to real-world application, physiology, or performance science.
- Only 1 lesson per day — which is correct, but the quality of that single lesson needs to be elite.

### Vitamin & Mineral Tracker (current `vault_vitamin_logs` table)
- Only tracks: `vitamin_name`, `dosage`, `timing`, `taken`, `is_recurring`
- **Missing entirely**: category (vitamin vs. mineral vs. supplement vs. herb), unit of measurement (mg, mcg, IU, g), purpose/health goal tag, weekly adherence analytics, smart suggestions from a curated reference list, and a "why this matters" education layer.
- The UI is a basic collapsible list with a free-text name input — no guidance on what to track or why.

---

## What's Being Changed

### 1. Health Tips — Upgraded AI Generation Prompt

**File:** `supabase/functions/get-daily-tip/index.ts`

The AI generation prompt is rewritten to enforce **elite-grade, science-backed specificity**. The new prompt:
- Requires citing the **physiological mechanism** (e.g., "cortisol spike post-training blunts glycogen synthesis for ~45 min — this is why timing matters")
- Requires one **concrete, same-day action** (e.g., "Add 20g whey within 30 min of your last training set today")
- Requires grounding in **peer-reviewed sports science concepts** without making medical diagnoses
- Explicitly forbids vague, pseudoscientific, or generic statements
- Adds sport-context specificity (baseball/softball rotational demands, high-anaerobic output)
- Scales the depth requirement to 2-4 sentences (up from 1-3)

No database migration needed — same table, better content going forward.

### 2. Mind Fuel Messages — Upgraded AI Generation Prompt

**File:** `supabase/functions/get-daily-lesson/index.ts`

The AI generation prompt is rewritten to produce **world-class mental performance content**. The new prompt:
- Requires a **real-world application frame**: what to do TODAY, not just a concept
- For `lesson`/`teaching`/`principle` types: must include the psychological or neurological basis (e.g., "the prefrontal cortex, responsible for performance regulation, goes offline under threat — here's how to keep it online")
- For `quote` types: must be attributed only to **verified real people** (coaches, athletes, philosophers), not invented
- For `mantra` types: must be 10 words or fewer, rhythmic, and anchored in a specific performance moment
- Adds the "elite 0.001% standard" framing from the app's full-loop philosophy

No database migration needed.

### 3. Vitamin & Mineral Tracker — Full Rebuild

This is the largest change. The tracker becomes a **professional-grade micronutrient management system**.

#### 3a. Database Migration

Add 3 new columns to `vault_vitamin_logs`:

```sql
ALTER TABLE public.vault_vitamin_logs
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'supplement',
  ADD COLUMN IF NOT EXISTS unit text DEFAULT 'mg',
  ADD COLUMN IF NOT EXISTS purpose text;
```

- `category`: `'vitamin' | 'mineral' | 'supplement' | 'herb' | 'protein' | 'amino_acid'`
- `unit`: `'mg' | 'mcg' | 'IU' | 'g' | 'ml' | 'capsule' | 'tablet' | 'serving'`
- `purpose`: free text tag like `"Bone health"`, `"Energy"`, `"Recovery"`, `"Immunity"`

#### 3b. New Hook additions to `useVitaminLogs.ts`

- Add `category`, `unit`, `purpose` to `VitaminLog` interface and `CreateVitaminInput`
- Expose weekly adherence: a `getWeeklyAdherence()` method that returns taken/total per day for the past 7 days (queried from the DB)

#### 3c. Updated `VitaminSupplementTracker.tsx`

Major UI/UX upgrade:

**Add Form** (expanded):
- Category selector (Vitamin / Mineral / Supplement / Herb / Protein / Amino Acid) with color-coded icons
- Name: keep as free text BUT add a **smart suggestion dropdown** using a curated reference list (the top 30 most common: Vitamin D3, Magnesium, Zinc, Omega-3, Iron, B12, C, Creatine, Melatonin, etc.) that filters as the user types
- Dosage field + Unit selector side by side (mg / mcg / IU / g / tablet / capsule / serving)
- Purpose tag: optional quick-select chips (Energy, Recovery, Immunity, Bone Health, Sleep, Focus, Hormone Support)
- Timing and Repeat Daily stay as-is

**Main View** (grouped by category, not timing):
- Group header shows category icon and color
- Each item row shows: name, dosage + unit, purpose chip (if set), timing badge, taken checkbox
- **7-day adherence mini-bar** per supplement row: 7 tiny dots (green = taken, grey = missed/not yet) showing the week's history
- Progress ring at the top showing today's overall completion %

**Info Layer** — a new "What this does" tooltip on each common supplement (for the 30 curated items) showing a one-line science note (e.g., for Vitamin D3: "Supports bone density, immune regulation, and testosterone synthesis")

This is added as a static `SUPPLEMENT_REFERENCE` lookup object in the component — no new API calls.

#### 3d. Curated Reference List (in-component constant)

A static object of 30+ common supplements with:
- Suggested unit
- Category
- One-line benefit note
- Common dosage range

This powers both the smart suggestions and the "What this does" tooltips.

---

## Files Changed

| File | Change Type |
|---|---|
| `supabase/functions/get-daily-tip/index.ts` | Rewrite AI prompt (~10 lines) |
| `supabase/functions/get-daily-lesson/index.ts` | Rewrite AI prompt (~10 lines) |
| `vault_vitamin_logs` table | Migration: 3 new columns |
| `src/hooks/useVitaminLogs.ts` | Add new fields + weekly adherence query |
| `src/components/vault/VitaminSupplementTracker.tsx` | Major rebuild of UI + smart suggestions + 7-day history |

---

## What the User Will Experience

**Health Tips**: Future AI-generated tips will read like elite sports nutritionist advice — with a physiological reason AND a same-day action step. The 515 existing tips are unchanged (they remain in DB), only new AI-generated tips going forward will be higher quality.

**Mind Fuel**: Future AI-generated lessons will feel like a world-class mental performance coach is speaking directly to the athlete — grounded in neuroscience, tied to a real game moment, and immediately actionable.

**Vitamin Tracker**: Transforms from a basic checklist into a professional micronutrient management dashboard — athletes can see what they're tracking, why it matters, what the dosage is in proper units, how consistent they've been this week, and quickly add from a smart-suggested reference list.
