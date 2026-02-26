

# Add Academic & NCAA Fields for High School AND College Players

## Overview

When a player indicates they are **in high school** (via a new checkbox), show fields for SAT Score, ACT Score, GPA, and NCAA ID Number. When a player indicates they are **enrolled in college** (existing checkbox), also show the NCAA ID Number field. The NCAA ID field includes an info button with a link to sign up, why it's needed, and when to register. All fields are visible to coaches and scouts on the player's profile.

---

## Changes

### 1. Database Migration

Add four new columns to the `profiles` table:

| Column | Type | Notes |
|--------|------|-------|
| `sat_score` | integer | Nullable, range 400-1600 |
| `act_score` | integer | Nullable, range 1-36 |
| `gpa` | numeric(4,2) | Nullable, range 0.00-5.00 |
| `ncaa_id` | text | Nullable |
| `currently_in_high_school` | boolean | Default false |

### 2. Profile Setup (`src/pages/ProfileSetup.tsx`)

- Add state: `currentlyInHighSchool`, `satScore`, `actScore`, `gpa`, `ncaaId`
- Add a **"Currently in High School"** checkbox alongside the existing checkboxes (enrolled in college, professional, etc.)
- When `currentlyInHighSchool` is checked, show:
  - SAT Score (number input, optional)
  - ACT Score (number input, optional)
  - GPA - End of Last Quarter (number input, optional)
  - NCAA ID Number (text input, optional) with info button
- When `enrolledInCollege` is checked (already exists), show:
  - NCAA ID Number (text input, optional) with info button
- The NCAA info button opens a popover/tooltip with:
  - What: Your NCAA Eligibility Center ID
  - Why: Required for college athletic recruitment eligibility
  - When: Register by the start of your junior year (recommended)
  - Link: https://web3.ncaa.org/ecwr3/
- Save all new fields to the profile on submit

### 3. Profile View & Edit (`src/pages/Profile.tsx`)

**Display**: Add an "Academic & NCAA Info" section in the player info grid, visible to all viewers (coaches, scouts, other players). Shows SAT, ACT, GPA, NCAA ID when any are populated.

**Edit Dialog**: Add the same conditional fields (high school checkbox triggers SAT/ACT/GPA/NCAA; college checkbox triggers NCAA). Include in `editForm` state and save logic.

### 4. Translations (`src/i18n/locales/en.json`)

Add keys for all new labels: `currentlyInHighSchool`, `satScore`, `actScore`, `gpa`, `ncaaId`, `ncaaInfoTitle`, `ncaaInfoDescription`, `ncaaInfoWhy`, `ncaaInfoWhen`, `ncaaSignupLink`

---

## Technical Details

### Conditional Logic Summary

```text
High School checked --> Show SAT, ACT, GPA, NCAA ID + info
College checked     --> Show NCAA ID + info
Both checked        --> Show all (NCAA ID shown once)
Neither checked     --> Show none of these fields
```

### NCAA Info Button Content

- "Your NCAA Eligibility Center ID is required for college athletic recruitment eligibility. It is recommended to register by the start of your junior year."
- Button links to: https://web3.ncaa.org/ecwr3/

### Files Modified

| File | Change |
|------|--------|
| Database migration | Add `sat_score`, `act_score`, `gpa`, `ncaa_id`, `currently_in_high_school` to `profiles` |
| `src/pages/ProfileSetup.tsx` | Add high school checkbox, conditional academic fields, NCAA info button |
| `src/pages/Profile.tsx` | Display academic/NCAA section; add to edit dialog |
| `src/i18n/locales/en.json` | Add translation keys for new labels and NCAA info |

