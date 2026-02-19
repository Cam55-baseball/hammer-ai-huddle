
# Completing the Remaining Wiring — Hammer's Concrete Physio™

## What's Already Done

- All 4 custom hooks exist and work
- All 6 physio components are built
- `useVault.ts` already saves `appetite`, `stress_sources`, `movement_restriction`, `resting_hr`
- `NutritionHubContent.tsx` already has `PhysioNutritionSuggestions` inserted
- `useUnifiedDataSync.ts` already has the 3 new tables registered
- `Vault.tsx` imports all 4 physio components but renders NONE of them

## Three Files Need Wiring

### File 1: `src/pages/Vault.tsx` (6 changes)

**Problem:** Imports exist for `PhysioRegulationBadge`, `PhysioHealthIntakeDialog`, `PhysioNightlyReportCard`, `PhysioAdultTrackingSection`, `usePhysioProfile`, `usePhysioDailyReport` but NONE are used in JSX.

**Changes:**

1. Add hook calls (after existing hooks ~line 125):
```ts
const { setupCompleted, adultFeaturesEnabled } = usePhysioProfile();
const { report, regulationScore, regulationColor, triggerReportGeneration } = usePhysioDailyReport();
const [intakeOpen, setIntakeOpen] = useState(false);
```

2. Add auto-open useEffect for intake dialog (when `!setupCompleted && hasAccess`):
```ts
useEffect(() => {
  if (hasAccess && !setupCompleted) setIntakeOpen(true);
}, [hasAccess, setupCompleted]);
```

3. Wire `triggerReportGeneration()` inside `handleQuizSubmit` when `selectedQuizType === 'night'`:
```ts
if (selectedQuizType === 'night' && result.success) {
  triggerReportGeneration();
}
```

4. Add `PhysioRegulationBadge` next to the BookOpen icon in the Vault hero header (line ~410):
```tsx
<PhysioRegulationBadge score={regulationScore} color={regulationColor} size="md" />
```

5. Add `PhysioNightlyReportCard` after the quiz status grid inside the Daily Check-In container (after the quiz buttons block, ~line 580):
```tsx
{hasCompletedQuiz('night') && <PhysioNightlyReportCard />}
```

6. Add `PhysioAdultTrackingSection` at the bottom of the left column (after `VaultCorrelationAnalysisCard` block, before Daily Check-In container):
```tsx
<PhysioAdultTrackingSection />
```

7. Render `PhysioHealthIntakeDialog` near the quiz dialog at line ~836:
```tsx
<PhysioHealthIntakeDialog open={intakeOpen} onOpenChange={setIntakeOpen} />
```

---

### File 2: `src/components/vault/VaultFocusQuizDialog.tsx` (4 additions)

**Problem:** New physio quiz fields are missing — resting HR, appetite, stress sources, illness sub-selector (morning quiz), and movement restriction screen (pre-lift quiz). Night quiz doesn't fire `triggerReportGeneration`.

The component doesn't accept a callback prop for report generation — the night quiz success flow already works, but it needs to call back to Vault.tsx. The simplest solution: `VaultFocusQuizDialog` calls `usePhysioDailyReport` internally and fires `triggerReportGeneration()` directly from within the night quiz success handler. This keeps zero prop changes.

**Morning quiz additions** (injected after the existing `sleepData` section + before motivationTitle section, ~after line 677):

Section label "Physio Check-in" containing:
- **Resting HR** — `<Input type="number" placeholder="e.g. 58">` + "Skip" button. Saves to `data.resting_hr`.
- **Appetite** — 3 tap-chips: 🥗 Low / 🍽️ Normal / 🍔 High. Saves to `data.appetite`.
- **Stress Sources** — multi-select chips: School / Work / Family / Travel / Competition Nerves / Illness. Saves to `data.stress_sources`.
- **Illness sub-selector** — appears when "Illness" is in stress sources: Cold / Flu / Fever / GI Distress. Calls `updateIllness()` from `usePhysioProfile`.

New state variables to add:
```ts
const [restingHr, setRestingHr] = useState('');
const [appetite, setAppetite] = useState('');
const [stressSources, setStressSources] = useState<string[]>([]);
const [illnessType, setIllnessType] = useState('');
```

Add to `handleSubmit` morning block:
```ts
data.resting_hr = restingHr ? parseInt(restingHr) : undefined;
data.appetite = appetite || undefined;
data.stress_sources = stressSources.length > 0 ? stressSources : undefined;
```

Add to `resetFormAndClose`:
```ts
setRestingHr(''); setAppetite(''); setStressSources([]); setIllnessType('');
```

**Pre-lift quiz additions** (new Section 5 — after existing Intent & Focus Section 4, ~after line 1136):

Movement restriction screen with 3 selectors, each Full ✅ / Limited ⚠️ / Pain ❌:
- Toe Touch
- Overhead Reach  
- Bodyweight Squat

New state:
```ts
const [movementRestriction, setMovementRestriction] = useState<Record<string, string>>({});
```

Saves as: `data.movement_restriction = Object.keys(movementRestriction).length > 0 ? movementRestriction : undefined;`

Add to `resetFormAndClose`: `setMovementRestriction({});`

**Night quiz trigger** — inside `handleSubmit` after `nightStats.refetch()` at line ~494:
```ts
if (quizType === 'night') {
  triggerReportGeneration(); // fire-and-forget, non-blocking
  nightStats.refetch();
  setShowNightSuccess(true);
  return;
}
```
Import `usePhysioDailyReport` at the top of the file and call `const { triggerReportGeneration } = usePhysioDailyReport();`

---

### File 3: `src/components/GamePlanCard.tsx` (2 additions)

**Problem:** `PhysioPostWorkoutBanner` and `usePhysioGamePlanBadges` badge chips are not imported or rendered.

**Change 1: Add imports + hook call** (~line 50):
```ts
import { PhysioPostWorkoutBanner } from '@/components/physio/PhysioPostWorkoutBanner';
import { usePhysioGamePlanBadges } from '@/hooks/usePhysioGamePlanBadges';
```

In the component body (~line 63):
```ts
const { getBadgesForTask } = usePhysioGamePlanBadges();
```

**Change 2: Add PhysioPostWorkoutBanner above task sections** (line ~1494, before `{/* Task Sections */}`):
```tsx
<PhysioPostWorkoutBanner />
```

**Change 3: Add badge chips inside `renderTask`** (after the task title `<span>` inside the clickable button area, ~line 1000):
```tsx
{(() => {
  const badges = getBadgesForTask(task.id);
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {badges.map(badge => (
        <Popover key={badge.type}>
          <PopoverTrigger asChild>
            <button className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
              badge.color === 'red' && "bg-red-500/20 text-red-400 border-red-500/30",
              badge.color === 'amber' && "bg-amber-500/20 text-amber-400 border-amber-500/30",
              badge.color === 'orange' && "bg-orange-500/20 text-orange-400 border-orange-500/30",
              badge.color === 'yellow' && "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
            )} onClick={e => e.stopPropagation()}>
              {badge.label}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 text-xs p-3" onClick={e => e.stopPropagation()}>
            <p>{badge.message}</p>
            <p className="text-muted-foreground mt-2 text-[10px]">Educational only. Consult a professional for medical concerns.</p>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  );
})()}
```

---

## Implementation Order

1. `VaultFocusQuizDialog.tsx` — add internal `usePhysioDailyReport` + new state + new UI sections + night trigger
2. `Vault.tsx` — wire all physio hooks + render 4 components + auto-open effect + night quiz trigger
3. `GamePlanCard.tsx` — add banner + badge chips

## Technical Notes

- `triggerReportGeneration()` is fire-and-forget (non-blocking) — it will never delay UI
- `PhysioAdultTrackingSection` self-hides when `adultFeaturesEnabled === false` — safe to always render
- `PhysioNightlyReportCard` reads from `usePhysioDailyReport` internally — no props needed
- Badge chips use existing `Popover` component already imported in `GamePlanCard.tsx`
- The `intakeOpen` auto-open fires only once when `hasAccess && !setupCompleted`
