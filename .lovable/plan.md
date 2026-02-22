

# Phase 6: i18n Updates for Tier Restructure

## What's Missing

The 8 locale files need new translation keys for the tier system, Unicorn program, arm care exercises, velocity development, and CNS budget system. Currently the UI uses hardcoded English strings -- this phase adds proper i18n support.

## Changes

All 8 files in `src/i18n/locales/` (en, es, fr, de, ja, ko, nl, zh) will get a new top-level section with these keys:

### Keys to Add

```
subscriptionTiers:
  pitcher:
    name: "Complete Pitcher"
    description: "Full pitching development program"
  5tool:
    name: "5Tool Player"
    description: "Hitting + throwing development program"
  golden2way:
    name: "The Golden 2Way"
    description: "Complete 2-way player development"

unicornProgram:
  title: "The Unicorn"
  description: "Elite merged training system"
  rules: (array of 5-6 rule strings)
  cnsbudget: "CNS Budget"
  overBudget: "Over Budget - consider reducing intensity"
  deloadWeek: "Deload Week - volume reduced by 40%"
  weeklyThrows: "Weekly Throw Count"
  throwingThreshold: "Throwing threshold reached"

armCare:
  title: "Arm Care"
  exercises:
    bandPullAparts: "Band Pull-Aparts"
    wallSlides: "Wall Slides"
    serratusPushUp: "Serratus Push-Up"
    proneYTW: "Prone Y-T-W Raises"
    sideLyingER: "Side-Lying External Rotation"
    proneIRaise: "Prone I Raise"
    eccentricWristCurl: "Eccentric Wrist Flexor Curl"
    er90Hold: "90/90 External Rotation Hold"

velocityDev:
  title: "Velocity Development"
  blockA: "Kinetic Chain + Weighted Ball"
  blockB: "Overload/Underload + Intent"
```

### Code Updates

After adding the keys, update these files to use `t()` calls instead of hardcoded strings:
- `src/pages/TheUnicorn.tsx` -- CNS labels, deload messages, rules display
- `src/pages/Pricing.tsx` -- tier names/descriptions (if hardcoded)
- `src/pages/Checkout.tsx` -- tier display names

## File Summary

| File | Action |
|------|--------|
| `src/i18n/locales/en.json` | Add tier/unicorn/armCare/velocityDev keys |
| `src/i18n/locales/es.json` | Add Spanish translations |
| `src/i18n/locales/fr.json` | Add French translations |
| `src/i18n/locales/de.json` | Add German translations |
| `src/i18n/locales/ja.json` | Add Japanese translations |
| `src/i18n/locales/ko.json` | Add Korean translations |
| `src/i18n/locales/nl.json` | Add Dutch translations |
| `src/i18n/locales/zh.json` | Add Chinese translations |
| `src/pages/TheUnicorn.tsx` | Replace hardcoded strings with `t()` calls |
| `src/pages/Pricing.tsx` | Replace hardcoded tier names with `t()` calls |
| `src/pages/Checkout.tsx` | Replace hardcoded tier names with `t()` calls |

