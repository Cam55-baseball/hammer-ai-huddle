
# Gender-Tailored Physio Health Setup — End-to-End Plan

## What Needs to Change

The Step 3 "Preferences" screen of the `PhysioHealthIntakeDialog` currently only shows an adult tracking opt-in button. The goal is to:

1. Ask for biological sex (Male / Female / Prefer not to say) at the start of Step 3
2. Show gender-tailored preference options based on the answer
3. For females who are 18+ and enable adult tracking, show a contraceptive use toggle with a type selector
4. Persist all of this to the database
5. Pipe the new context into the AI regulation report for smarter, more personalized insights
6. Update `PhysioAdultTrackingSection` to read sex from `physio_health_profiles` instead of `profiles`

---

## Database Migration

Two new columns need to be added:

**Table: `physio_health_profiles`**
- `biological_sex` (text, nullable) — values: `male`, `female`, `prefer_not_to_say`
- `contraceptive_use` (boolean, nullable, default null) — whether the user is actively using contraceptives
- `contraceptive_type` (text, nullable) — e.g. Pill, IUD, Implant, Patch, Ring, Injection, Barrier, Other

These are stored on the health profile (not the adult tracking daily log) because they are static health facts, not daily entries.

---

## File Changes

### 1. `src/components/physio/PhysioHealthIntakeDialog.tsx`

**Step 3 becomes a two-part screen:**

**Part A — Biological Sex selector (always shown at top of Step 3):**
Three large toggle cards:
- ♂ Male
- ♀ Female
- ○ Prefer not to say

This saves `biological_sex` to `physio_health_profiles`.

**Part B — Gender-tailored content (below the sex selector):**

If **Male** selected:
- A brief note that their regulation reports will be calibrated for male physiology (testosterone cycles, recovery patterns, CNS load tracking)
- The existing adult opt-in button (no contraceptive section)

If **Female** selected:
- A note that their reports will factor in cycle phase awareness, hormonal load sensitivity, and iron/fuel considerations
- The adult opt-in button (same age gate logic as before)
- **If adult tracking is enabled AND she agrees to 18+:** A new "Contraceptive Use" section appears:
  - A toggle button: "I am currently using a contraceptive"
  - If toggled on: a chip selector for type: `Pill`, `IUD`, `Implant`, `Patch`, `Ring`, `Injection`, `Barrier`, `Other`
  - A small disclaimer: "This helps us factor hormonal influences on your recovery and energy patterns. Educational only."

If **Prefer not to say** selected:
- Shows the adult opt-in button with neutral language
- No contraceptive section

**New state variables added to the dialog:**
```ts
const [biologicalSex, setBiologicalSex] = useState('');
const [contraceptiveUse, setContraceptiveUse] = useState(false);
const [contraceptiveType, setContraceptiveType] = useState('');
```

**`handleSaveAndClose` updated to include:**
```ts
biological_sex: biologicalSex || null,
contraceptive_use: biologicalSex === 'female' && adultAgreed ? contraceptiveUse : null,
contraceptive_type: biologicalSex === 'female' && adultAgreed && contraceptiveUse ? contraceptiveType || null : null,
```

---

### 2. `src/hooks/usePhysioProfile.ts`

**`PhysioHealthProfile` interface updated:**
```ts
biological_sex: string | null;
contraceptive_use: boolean | null;
contraceptive_type: string | null;
```

---

### 3. `src/components/physio/PhysioAdultTrackingSection.tsx`

Currently reads `sex` from the `profiles` table via a separate query. After this change it reads `biological_sex` from `physio_health_profiles` via `usePhysioProfile()` — which is already fetched in the hook — eliminating the extra query.

```ts
// Before:
const { data: profileData } = useQuery({ ... supabase.from('profiles').select('sex') ... });
const sex = profileData?.sex?.toLowerCase();

// After:
const { profile } = usePhysioProfile();
const sex = profile?.biological_sex?.toLowerCase();
```

The `isFemale` / `isMale` checks then use this value. Contraceptive use is also read from `profile.contraceptive_use` to slightly adjust the cycle phase UI — e.g. a small info chip showing "Hormonal contraceptive noted — cycle phase tracking may vary" if `contraceptive_use === true`.

---

### 4. `supabase/functions/calculate-regulation/index.ts`

The edge function already fetches `profiles` for `activity_level` and `weight`. Extend that query to also fetch from `physio_health_profiles` for `biological_sex` and `contraceptive_use`, then pass them into the AI prompt context:

```ts
const { data: physioHealthProfile } = await supabase
  .from('physio_health_profiles')
  .select('biological_sex, contraceptive_use, contraceptive_type, medications, medical_conditions')
  .eq('user_id', userId)
  .maybeSingle();
```

The AI context object is enriched:
```ts
biologicalSex: physioHealthProfile?.biological_sex,
contraceptiveUse: physioHealthProfile?.contraceptive_use,
contraceptiveType: physioHealthProfile?.contraceptive_type,
```

The AI system prompt is updated to acknowledge these factors:
- For females: factor in cycle phase sensitivity, hormonal load, iron needs
- For females on hormonal contraceptives: note that cycle phase tracking may not reflect natural hormonal fluctuations and adjust recovery framing accordingly
- For males: factor in CNS load tolerance, testosterone-linked recovery rhythms

---

## Implementation Order

1. Database migration — add `biological_sex`, `contraceptive_use`, `contraceptive_type` to `physio_health_profiles`
2. Update `usePhysioProfile.ts` interface
3. Update `PhysioHealthIntakeDialog.tsx` — add sex selector + conditional contraceptive section in Step 3
4. Update `PhysioAdultTrackingSection.tsx` — read sex from physio profile instead of profiles table; add contraceptive note
5. Update `calculate-regulation` edge function — extend context + enrich AI prompt

## Technical Notes

- `biological_sex` is stored on `physio_health_profiles`, not on `profiles.sex`, keeping physio data self-contained in the physio tables
- The contraceptive section only appears when: `biologicalSex === 'female'` AND `enableAdult === true` AND `adultAgreed === true`
- `contraceptive_use` and `contraceptive_type` are only written when the user is female and has agreed to adult tracking — otherwise saved as `null`
- The age gate (`enableAdultFeatures`) remains unchanged — it checks `profiles.date_of_birth`
- The edge function changes are additive and non-breaking — if `biological_sex` is null, the AI prompt simply omits that context
