

# Date of Birth: Single Source of Truth Across the App

## Problem

1. **Date of birth is entered separately in multiple places** -- Profile Setup doesn't collect it, but Physio Health Setup and TDEE Setup Wizard each ask for it independently, storing it in different tables (`physio_health_profiles.date_of_birth` vs `profiles.date_of_birth`).
2. **Navigating birth year in the calendar is painfully slow** -- users click month-by-month through potentially 20+ years to reach their birth year.
3. **Physio 18+ age gate doesn't use the main profile DOB** -- it only checks `physio_health_profiles.date_of_birth`, so users who already entered their DOB elsewhere have to re-enter it.

## Solution

### 1. Add Date of Birth to Profile Setup (required field)

**File: `src/pages/ProfileSetup.tsx`**
- Add a new `dateOfBirth` state field
- Add a DOB picker input (with year dropdown for fast navigation -- see item 2 below) in the form, marked as required
- Save `date_of_birth` to the `profiles` table during `handleCompleteSetup`
- This becomes the single source of truth for DOB across the app

### 2. Fast Year Navigation for All DOB Pickers

**File: `src/components/ui/calendar.tsx`** -- Add a `captionLayout="dropdown"` variant or create a new `BirthDatePicker` component

**New File: `src/components/ui/BirthDatePicker.tsx`**
- A specialized date picker with **year and month dropdown selects** instead of clicking arrows month-by-month
- Year dropdown ranging from current year back to 1920
- Month dropdown for quick month selection
- Once year/month are selected, the calendar grid shows days for final selection
- Used in ProfileSetup, PhysioHealthIntakeDialog, and TDEESetupWizard wherever DOB is collected

### 3. Physio Health Setup Reads DOB from Profile

**File: `src/components/physio/PhysioHealthIntakeDialog.tsx`**
- On initial setup (not edit mode), fetch `date_of_birth` from the `profiles` table
- If a DOB already exists in the profile, display it as read-only (same as edit mode behavior) and skip asking the user to re-enter it
- The age calculation and 18+ gate use the profile's DOB
- Still save a copy to `physio_health_profiles.date_of_birth` for the regulation engine's convenience, but the profile DOB is the authority
- Remove the DOB input from step 3 when DOB is already set in the main profile

### 4. Physio Health Profile Syncs to Main Profile on First Setup

**File: `src/components/physio/PhysioHealthIntakeDialog.tsx`**
- When Physio Health Setup completes for the first time, also write `biological_sex` to `profiles.sex` if the profile's `sex` field is empty (keeps data consistent)
- If the main profile already has `sex` set, pre-populate the Physio biological sex selector from it

### 5. usePhysioProfile Age Gate Uses Profile DOB

**File: `src/hooks/usePhysioProfile.ts`**
- Update `enableAdultFeatures` to check `profiles.date_of_birth` as the primary source, falling back to `physio_health_profiles.date_of_birth`
- Update `computedAge` to prefer the profile DOB

### 6. TDEE Setup Wizard Pre-fills from Profile

**File: `src/components/nutrition-hub/TDEESetupWizard.tsx`**
- Already reads from `profiles.date_of_birth` -- no changes needed here, but it will benefit from DOB being set earlier during profile creation

## Technical Details

### No database migration needed
The `profiles` table already has `date_of_birth` (date, nullable) and `sex` (text, nullable) columns.

### Files to create
- `src/components/ui/BirthDatePicker.tsx` -- Reusable DOB picker with year/month dropdowns

### Files to modify
- `src/pages/ProfileSetup.tsx` -- Add required DOB field using BirthDatePicker, save to profiles.date_of_birth
- `src/components/physio/PhysioHealthIntakeDialog.tsx` -- Read DOB from profiles table, show as read-only if already set, sync biological_sex back to profiles.sex
- `src/hooks/usePhysioProfile.ts` -- Prefer profiles.date_of_birth for age calculations
- `src/components/nutrition-hub/TDEESetupWizard.tsx` -- Replace calendar with BirthDatePicker for faster year navigation

### Data flow after changes

```text
Profile Setup (onboarding)
    |
    +--> profiles.date_of_birth  (single source of truth)
    |
    +--> Physio Health Setup reads it, shows read-only
    |       |
    |       +--> copies to physio_health_profiles.date_of_birth
    |       +--> syncs biological_sex to profiles.sex
    |
    +--> TDEE Setup reads it, pre-fills
    |
    +--> usePhysioProfile.computedAge reads it
    +--> 18+ age gate reads it
```
