

# Fix Raw Text Display + Add Nutrition Goal Settings

## Problem Summary

1. **Raw text like "gain lean_muscle"**: The code uses `goalType.replace('_', ' ')` which only replaces the FIRST underscore, leaving "gain_lean_muscle" as "gain lean_muscle"
2. **No quick goal change option**: Currently users must re-enter all their biometric data (height, weight, DOB, etc.) just to change their nutrition goal

---

## Solution Overview

### 1. Fix Raw Goal Type Display

Create a utility function that properly formats goal types with i18n support:

**New translation keys in `en.json`:**
```json
"nutritionHub": {
  "goalTypes": {
    "lose_weight": "Lose Weight",
    "lose_fat": "Lose Fat",
    "maintain": "Maintain",
    "gain_lean_muscle": "Gain Lean Muscle",
    "gain_weight": "Gain Weight"
  },
  "dayTypes": {
    "rest": "Rest",
    "training": "Training",
    "practice": "Practice",
    "game": "Game",
    "travel": "Travel"
  }
}
```

**Update `MacroTargetDisplay.tsx`:**
- Replace `targets.goalType.replace('_', ' ')` with proper i18n lookup
- Add translations for all 5 goal types across all 9 locale files

---

### 2. Add Nutrition Hub Settings with Goal Change

Create a new **NutritionHubSettings** component that provides:
- Quick goal change (without re-entering biometrics)
- Optional link to full profile edit if needed

**UI Design:**
```text
┌─────────────────────────────────────────────┐
│ Nutrition Settings                          │
├─────────────────────────────────────────────┤
│ Current Goal: [Gain Lean Muscle]      ✏️   │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ○ Lose Weight                           │ │
│ │ ○ Lose Fat                              │ │
│ │ ● Maintain                              │ │
│ │ ○ Gain Lean Muscle                      │ │
│ │ ○ Gain Weight                           │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Update Goal]                               │
│                                             │
│ ─────────────────────────────────────────── │
│ Need to update your profile info?           │
│ [Edit Profile Settings]                     │
└─────────────────────────────────────────────┘
```

---

## Technical Implementation

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/nutrition-hub/NutritionHubSettings.tsx` | Settings dialog with goal selector |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/nutrition-hub/MacroTargetDisplay.tsx` | Replace raw string replace with i18n lookup |
| `src/components/nutrition-hub/NutritionHubContent.tsx` | Add settings dialog trigger instead of TDEE wizard |
| `src/hooks/useAthleteGoals.ts` | Add `updateGoalType` method for quick goal changes |
| `src/i18n/locales/en.json` | Add `nutritionHub.goalTypes` and `nutritionHub.dayTypes` |
| `src/i18n/locales/es.json` | Add translations |
| `src/i18n/locales/fr.json` | Add translations |
| `src/i18n/locales/de.json` | Add translations |
| `src/i18n/locales/ja.json` | Add translations |
| `src/i18n/locales/ko.json` | Add translations |
| `src/i18n/locales/zh.json` | Add translations |
| `src/i18n/locales/nl.json` | Add translations |

---

## Component Details

### NutritionHubSettings Component

```typescript
interface NutritionHubSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoalChanged?: () => void;
  onEditProfile?: () => void;
}
```

**Features:**
- Shows current goal with radio button selector for all 5 goal types
- Displays calorie adjustment preview for selected goal
- "Update Goal" button to save changes
- "Edit Profile Settings" link to open full TDEE wizard if needed
- Uses `useAthleteGoals` hook to update goal without touching profile

---

## Goal Type Labels (All Languages)

| Key | EN | ES | FR | DE |
|-----|----|----|----|----|
| lose_weight | Lose Weight | Perder Peso | Perdre du Poids | Gewicht Verlieren |
| lose_fat | Lose Fat | Perder Grasa | Perdre de la Graisse | Fett Verlieren |
| maintain | Maintain | Mantener | Maintenir | Halten |
| gain_lean_muscle | Gain Lean Muscle | Ganar Músculo | Prendre du Muscle | Muskeln Aufbauen |
| gain_weight | Gain Weight | Aumentar Peso | Prendre du Poids | Gewicht Zunehmen |

| Key | JA | KO | ZH | NL |
|-----|----|----|----|----|
| lose_weight | 減量 | 체중 감량 | 减重 | Afvallen |
| lose_fat | 脂肪を落とす | 체지방 감량 | 减脂 | Vetverbranding |
| maintain | 維持 | 유지 | 维持 | Handhaven |
| gain_lean_muscle | 筋肉増量 | 근육 증가 | 增肌 | Spieropbouw |
| gain_weight | 増量 | 체중 증가 | 增重 | Aankomen |

---

## User Flow

1. User clicks Settings icon in Nutrition Hub header
2. Settings dialog opens showing current goal
3. User selects new goal from radio options
4. Calorie adjustment preview updates in real-time
5. User clicks "Update Goal"
6. Goal saved, dialog closes, targets recalculate
7. If user needs to change biometrics, they click "Edit Profile Settings" to open full wizard

---

## Expected Outcome

1. **Fixed display**: "Gain Lean Muscle" shows correctly (not "gain lean_muscle")
2. **All languages**: Goal types properly translated in all 9 locales
3. **Quick goal change**: Users can change their nutrition goal without re-entering height, weight, DOB, etc.
4. **Profile edit option**: Full profile editing still available when needed

