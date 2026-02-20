
# Gender & Age-Tailored Physio Health Setup — Updated End-to-End Plan

## Overview of Changes

The Step 3 "Preferences" screen of `PhysioHealthIntakeDialog` currently only shows an adult tracking opt-in button. This plan expands it into a structured, sequenced set of personal context questions:

1. Date of birth (calculates age live — unlocks adult tracking if 18+, tailors language by age)
2. Biological sex (Male / Female / Prefer not to say)
3. Gender-tailored content (different notes + options per sex)
4. For females who are 18+ and opt in: contraceptive use toggle + type selector

All new data is persisted to the database and piped into the AI regulation report.

---

## Step 3 Flow — Visual Order

```text
Step 3: Preferences
├── [1] Date of Birth (date picker)
│     └── Calculated age shown inline: "You are 22 years old"
│
├── [2] Biological Sex (tap cards)
│     ├── ♂ Male
│     ├── ♀ Female
│     └── ○ Prefer not to say
│
└── [3] Gender-Tailored Content
      ├── MALE:
      │     - Insight note: CNS load, testosterone recovery rhythms
      │     - Adult tracking opt-in (no contraceptive section)
      │
      ├── FEMALE:
      │     - Insight note: cycle phase sensitivity, iron/fuel needs
      │     - Adult tracking opt-in (age gate: DOB confirms 18+)
      │     - IF adult enabled + 18+ agreed:
      │           → "I am currently using a contraceptive" toggle
      │           → IF toggled on: chip selector for type
      │             (Pill / IUD / Implant / Patch / Ring / Injection / Barrier / Other)
      │           → Disclaimer: educational only
      │
      └── PREFER NOT TO SAY:
            - Neutral adult tracking opt-in
            - No contraceptive section
```

---

## Database Migration

Three new columns added to `physio_health_profiles`:

| Column | Type | Notes |
|---|---|---|
| `date_of_birth` | date, nullable | Stored here to keep physio data self-contained; `profiles.date_of_birth` already exists but physio should own its own copy |
| `biological_sex` | text, nullable | Values: `male`, `female`, `prefer_not_to_say` |
| `contraceptive_use` | boolean, nullable | Only written when female + 18+ + adult agreed |
| `contraceptive_type` | text, nullable | Only written when `contraceptive_use = true` |

Note: `profiles` already has a `date_of_birth` column. The physio flow will save DOB to `physio_health_profiles.date_of_birth` directly so the `enableAdultFeatures` age check can read from that column instead of the `profiles` table, keeping physio data self-contained.

---

## File Changes

### 1. Database Migration (new columns on `physio_health_profiles`)

```sql
ALTER TABLE public.physio_health_profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS biological_sex text,
  ADD COLUMN IF NOT EXISTS contraceptive_use boolean,
  ADD COLUMN IF NOT EXISTS contraceptive_type text;
```

---

### 2. `src/hooks/usePhysioProfile.ts`

**Interface additions:**
```ts
date_of_birth: string | null;
biological_sex: string | null;
contraceptive_use: boolean | null;
contraceptive_type: string | null;
```

**`enableAdultFeatures` updated:** Instead of fetching `profiles.date_of_birth`, it reads `physio_health_profiles.date_of_birth` (already loaded in the `profile` object), eliminating the extra query. Age is calculated from that value.

**New exported helper:** `computedAge: number | null` — derived from `profile?.date_of_birth` — so any consuming component can read the user's age without recalculating.

---

### 3. `src/components/physio/PhysioHealthIntakeDialog.tsx` — Step 3 redesign

**New state variables:**
```ts
// Step 3
const [dateOfBirth, setDateOfBirth] = useState('');      // YYYY-MM-DD string from date input
const [biologicalSex, setBiologicalSex] = useState('');  // 'male' | 'female' | 'prefer_not_to_say'
const [contraceptiveUse, setContraceptiveUse] = useState(false);
const [contraceptiveType, setContraceptiveType] = useState('');
```

**Age computed inline (no library needed):**
```ts
const computedAge = dateOfBirth ? (() => {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  return today.getFullYear() - dob.getFullYear() -
    (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
})() : null;

const isAdultEligible = computedAge !== null && computedAge >= 18;
```

**Date of birth input:** A native `<input type="date">` styled to match the existing design (no external library). Displays computed age inline as a muted label (e.g. "Age: 22") when filled.

**Age-tailored content notes:** The insight note shown after sex selection adapts language:
- Under 18: recovery framing emphasises growth plates, development windows, sleep priority
- 18–25: performance/hormonal peak language
- 26–35: CNS efficiency, durability framing
- 35+: recovery investment, load management language

**Adult tracking opt-in changes:**
- The "Enable Adult Tracking" button only appears when `isAdultEligible` is true
- If under 18, a soft note replaces it: "Adult tracking is available at 18+"
- The existing manual age-confirmation checkbox ("I confirm I am 18 or older") is **removed** — the DOB itself acts as the gate. No redundant double confirmation needed.

**Contraceptive section** (only when `biologicalSex === 'female'` AND `enableAdult === true` AND `isAdultEligible`):
- Toggle button: "I am currently using a contraceptive"
- If toggled on: chip selector for type from `['Pill', 'IUD', 'Implant', 'Patch', 'Ring', 'Injection', 'Barrier', 'Other']`
- Disclaimer: "This helps us factor hormonal influences on recovery and energy patterns. Educational only."

**`handleSaveAndClose` additions:**
```ts
date_of_birth: dateOfBirth || null,
biological_sex: biologicalSex || null,
contraceptive_use: biologicalSex === 'female' && enableAdult ? contraceptiveUse : null,
contraceptive_type: biologicalSex === 'female' && enableAdult && contraceptiveUse ? contraceptiveType || null : null,
```

**`enableAdultFeatures` call updated:** Since the DOB gates visibility of the button, calling `enableAdultFeatures()` is now always valid when the button is visible. The `adultAgreed` state and checkbox are removed.

---

### 4. `src/components/physio/PhysioAdultTrackingSection.tsx`

Currently reads `sex` from `profiles` via a separate query. After this change:

```ts
// Before:
const { data: profileData } = useQuery({ ... supabase.from('profiles').select('sex') ... });
const sex = profileData?.sex?.toLowerCase();

// After:
const { profile } = usePhysioProfile();
const sex = profile?.biological_sex;
```

This removes the extra `profiles` query entirely — `biological_sex` is now on the physio profile, already loaded.

**Contraceptive note added** when `profile?.contraceptive_use === true`:
```tsx
<div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded-lg">
  Hormonal contraceptive noted — cycle phase tracking may reflect symptom patterns rather than natural hormonal fluctuations.
</div>
```

---

### 5. `supabase/functions/calculate-regulation/index.ts`

Extend the data fetch to pull from `physio_health_profiles`:

```ts
const { data: physioHealthProfile } = await supabase
  .from('physio_health_profiles')
  .select('biological_sex, contraceptive_use, contraceptive_type, date_of_birth, medications, medical_conditions')
  .eq('user_id', userId)
  .maybeSingle();
```

Compute age in the edge function:
```ts
let athleteAge: number | null = null;
if (physioHealthProfile?.date_of_birth) {
  const dob = new Date(physioHealthProfile.date_of_birth);
  const today = new Date();
  athleteAge = today.getFullYear() - dob.getFullYear() -
    (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
}
```

Add to `contextData` object passed to the AI:
```ts
biologicalSex: physioHealthProfile?.biological_sex,
contraceptiveUse: physioHealthProfile?.contraceptive_use,
contraceptiveType: physioHealthProfile?.contraceptive_type,
athleteAge,
```

**System prompt updated** to instruct the AI:
- For males: factor in CNS load tolerance and testosterone-linked recovery rhythms
- For females: factor in cycle phase sensitivity, hormonal load, iron and fuel considerations
- For females on hormonal contraceptives: note that cycle phase tracking reflects symptoms, not natural hormonal fluctuations; adjust recovery framing accordingly
- For athletes under 18: emphasize growth plate recovery, sleep as primary adaptation signal, caution on high-load recommendations
- For athletes 35+: weight recovery investment more heavily, reference durability over peak output

---

## Implementation Order

1. Database migration — add 4 new columns to `physio_health_profiles`
2. `usePhysioProfile.ts` — update interface + remove `profiles` DOB query from `enableAdultFeatures` + export `computedAge`
3. `PhysioHealthIntakeDialog.tsx` — add DOB input, sex selector, age-tailored notes, updated adult gate, contraceptive section
4. `PhysioAdultTrackingSection.tsx` — remove `profiles` sex query, read from physio profile, add contraceptive note
5. `calculate-regulation` edge function — extend data fetch, compute age, enrich AI context + system prompt

## Technical Notes

- DOB is stored on `physio_health_profiles` (not `profiles`) so all physio data is self-contained in physio tables
- The manual "I confirm I am 18+" checkbox is removed — the DOB date picker acts as the single age gate
- `contraceptive_use` / `contraceptive_type` are only written when `biologicalSex === 'female'` AND `enableAdult === true` — otherwise null
- Age-tailored language is applied in both the dialog UI notes AND the AI system prompt
- Edge function changes are fully additive and non-breaking — if any field is null, the AI simply omits that context block
- The `adultAgreed` state variable is removed; `enableAdult` alone drives the toggle state, gated by the DOB-derived `isAdultEligible`
