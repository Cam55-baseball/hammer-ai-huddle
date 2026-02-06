

# Complete Speed Lab E2E -- Remaining Work

## Status Check

The Speed Lab implementation is approximately 80% complete. Here is what has been built and what remains:

### Already Complete
- Database: 3 tables (`speed_sessions`, `speed_goals`, `speed_partner_timings`) with RLS policies
- Data file: `src/data/speedLabProgram.ts` with full drill library, distance configs, session templates, goal tiers
- Hook: `src/hooks/useSpeedProgress.ts` with session scheduling, goal engine, break day detection, PB tracking
- All 11 UI components in `src/components/speed-lab/`
- Main page: `src/pages/SpeedLab.tsx` with onboarding, main view, and session flow
- Routing: `/speed-lab` route in `App.tsx`
- Sidebar: Speed Lab submodule under "throwing" in `AppSidebar.tsx`
- English translations: Full `speedLab` section in `en.json` (lines 7319-7462)

### Remaining Work
**7 locale files are missing the `speedLab` translations entirely.** The files `de.json`, `es.json`, `fr.json`, `ja.json`, `ko.json`, `nl.json`, and `zh.json` have NO `speedLab` key. This means non-English users will see English fallback strings for every Speed Lab label.

---

## Implementation Plan

### 1. German (`de.json`) -- Add `speedLab` Section
Append the full `speedLab` translation block before the closing `}`. All user-facing strings translated to German. "Hammer" stays as "Hammer" (brand name). ~145 lines of translated keys covering:
- Title, subtitle, access gate messaging
- Onboarding (Start My Speed Journey / Starte meine Speed-Reise)
- Check-in labels (sleep, body feel, pain)
- Focus card, drill categories
- Log results, partner mode, timer controls
- RPE slider (10 levels)
- Break day messaging + override dialog
- Track names + goal text
- Trend labels, stats, session history
- Completion screen, adjustment card, disclaimer

### 2. Spanish (`es.json`) -- Add `speedLab` Section
Same structure as German, translated to Spanish. Example entries:
- "Start My Speed Journey" -> "Comienza Mi Camino de Velocidad"
- "Recovery builds speed." -> "La recuperacion construye velocidad."
- "Today we protect speed." -> "Hoy protegemos la velocidad."

### 3. French (`fr.json`) -- Add `speedLab` Section
Same structure, translated to French. Example entries:
- "Start My Speed Journey" -> "Commencer Mon Parcours Vitesse"
- "Fast bodies are springy bodies." -> "Les corps rapides sont des corps elastiques."

### 4. Japanese (`ja.json`) -- Add `speedLab` Section
Same structure, translated to Japanese. Example entries:
- "Speed Lab" -> "Speed Lab" (brand name kept in English)
- "Start My Speed Journey" -> "スピードの旅を始める"
- "Recovery builds speed." -> "回復がスピードを作る。"

### 5. Korean (`ko.json`) -- Add `speedLab` Section
Same structure, translated to Korean. Example entries:
- "Start My Speed Journey" -> "스피드 여정 시작하기"
- "Recovery builds speed." -> "회복이 스피드를 만든다."

### 6. Dutch (`nl.json`) -- Add `speedLab` Section
Same structure, translated to Dutch. Example entries:
- "Start My Speed Journey" -> "Begin Mijn Snelheidsreis"
- "Recovery builds speed." -> "Herstel bouwt snelheid."

### 7. Chinese Simplified (`zh.json`) -- Add `speedLab` Section
Same structure, translated to Simplified Chinese. Example entries:
- "Start My Speed Journey" -> "开始我的速度之旅"
- "Recovery builds speed." -> "恢复造就速度。"

---

## Technical Details

- Each locale file gets the same JSON structure as `en.json` lines 7319-7462 (the `speedLab` key with ~145 lines)
- The new block is inserted before the final closing `}` brace of each file
- No structural changes to any component or logic files -- they already reference translation keys with English fallbacks
- All 7 files follow the same pattern: the `myCustomActivities` section is the last key, so the new `speedLab` section is appended after it
- Brand names ("Speed Lab", "Hammer") remain in English across all languages
- Kid-friendly tone is maintained in every language

### File Changes Summary

| File | Action | Lines Added |
|------|--------|-------------|
| `src/i18n/locales/de.json` | Edit (append before `}`) | ~145 |
| `src/i18n/locales/es.json` | Edit (append before `}`) | ~145 |
| `src/i18n/locales/fr.json` | Edit (append before `}`) | ~145 |
| `src/i18n/locales/ja.json` | Edit (append before `}`) | ~145 |
| `src/i18n/locales/ko.json` | Edit (append before `}`) | ~145 |
| `src/i18n/locales/nl.json` | Edit (append before `}`) | ~145 |
| `src/i18n/locales/zh.json` | Edit (append before `}`) | ~145 |

**Total: 7 files edited, ~1,015 lines of translations added**

After this, the Speed Lab will be 100% complete E2E across all 8 supported languages.

