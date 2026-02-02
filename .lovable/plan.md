

# Add 5lb Medicine Ball Prompt for MB Sit-Up Throw and Seated Chest Pass

## Overview

Add an informational hint in the Performance Tests section that prompts users to use a 5lb medicine ball (MB) when performing the MB Sit-Up Throw and Seated Chest Pass tests.

---

## Technical Implementation

### File 1: `src/components/vault/VaultPerformanceTestCard.tsx`

**Changes:**

1. **Add a helper constant** to identify medicine ball metrics:
   ```typescript
   const MEDICINE_BALL_METRICS = ['mb_situp_throw', 'seated_chest_pass'];
   ```

2. **Add a conditional hint** that displays when the current module includes medicine ball metrics:
   - Place it above the regular metrics grid
   - Only show when `mb_situp_throw` or `seated_chest_pass` are in the active `regularMetrics` array
   - Use a subtle info-style Alert component with an icon

**UI Placement:**
```text
┌─────────────────────────────────────────────────────────────────┐
│ [Module selector]                                                │
├─────────────────────────────────────────────────────────────────┤
│ ℹ️ Use a 5lb medicine ball for MB Sit-Up Throw and              │
│    Seated Chest Pass measurements.                               │
├─────────────────────────────────────────────────────────────────┤
│ [Metric inputs...]                                               │
└─────────────────────────────────────────────────────────────────┘
```

**Code Addition** (after line 537, before regular metrics grid):
```typescript
{/* Medicine Ball hint - show when MB metrics are present */}
{regularMetrics.some(m => MEDICINE_BALL_METRICS.includes(m)) && (
  <Alert className="bg-blue-500/10 border-blue-500/30">
    <AlertCircle className="h-4 w-4 text-blue-500" />
    <AlertDescription className="text-sm text-blue-700 dark:text-blue-400">
      {t('vault.performance.medicineBallHint')}
    </AlertDescription>
  </Alert>
)}
```

---

### File 2: `src/i18n/locales/en.json`

**Add translation key** in the `vault.performance` section:
```json
"medicineBallHint": "Use a 5lb medicine ball for MB Sit-Up Throw and Seated Chest Pass."
```

---

### Files 3-9: Other locale files

Add translated versions of the hint:

| File | Translation |
|------|-------------|
| `es.json` | "Usa un balón medicinal de 5 libras para el Lanzamiento MB Abdominal y el Pase de Pecho Sentado." |
| `fr.json` | "Utilisez un ballon médicinal de 5 lb pour le Lancer Abdominal MB et la Passe Poitrine Assise." |
| `de.json` | "Verwenden Sie einen 5 lb Medizinball für den MB Sit-Up Wurf und den Brustpass Sitzend." |
| `ja.json` | "MBシットアップスローとシーテッドチェストパスには5ポンドのメディシンボールを使用してください。" |
| `ko.json` | "MB 윗몸일으키기 던지기와 앉아서 가슴 패스에는 5파운드 메디신볼을 사용하세요." |
| `zh.json` | "药球仰卧起坐抛和坐姿胸前传球请使用5磅药球。" |
| `nl.json` | "Gebruik een 5 lb medicijnbal voor de MB Sit-Up Worp en Zittende Borstpass." |

---

## Files to Update

| File | Changes |
|------|---------|
| `src/components/vault/VaultPerformanceTestCard.tsx` | Add medicine ball constant and conditional hint Alert |
| `src/i18n/locales/en.json` | Add `medicineBallHint` translation |
| `src/i18n/locales/es.json` | Add `medicineBallHint` translation |
| `src/i18n/locales/fr.json` | Add `medicineBallHint` translation |
| `src/i18n/locales/de.json` | Add `medicineBallHint` translation |
| `src/i18n/locales/ja.json` | Add `medicineBallHint` translation |
| `src/i18n/locales/ko.json` | Add `medicineBallHint` translation |
| `src/i18n/locales/zh.json` | Add `medicineBallHint` translation |
| `src/i18n/locales/nl.json` | Add `medicineBallHint` translation |

---

## Expected Outcome

When users select any module that includes the MB Sit-Up Throw or Seated Chest Pass metrics (Hitting, Pitching, or Throwing for both baseball and softball), they will see a clear blue info banner reminding them to use a 5lb medicine ball for accurate measurements.

