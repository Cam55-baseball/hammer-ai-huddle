
# Tex Vision E2E Fix Plan: Seamless Drill Flow & Fatigue System

## Issues Identified

### 1. Confetti + Slow Checklist Loading
- Confetti triggers immediately on drill completion, but the conclusion screen feels sluggish
- Multiple async operations run sequentially in `handleDrillComplete`
- The `triggerCelebration()` call blocks visual feedback while heavy state updates happen

### 2. Drill Gets Stuck on Completed Screen with Critical Fatigue
- Critical fatigue indicator (>=80%) appears as a non-blocking overlay during the playing phase
- The drill continues running in the background while the fatigue warning shows
- If drill completes while fatigue modal is visible, state can get corrupted

### 3. Done Button Not Working
- The Done button calls `onComplete(completedResult)` which then calls parent's `handleDrillComplete`
- If `completedResult` state is stale or the async chain fails silently, the button appears to do nothing
- No loading state or error handling on the Done button

### 4. Critical Fatigue Needs Better UX
- No "Continue Anyway" option - only "End Session"
- Game doesn't pause when critical fatigue appears
- Athletes can't choose to push through if they want to

### 5. Pause Button Not Working
- DrillTimer has pause functionality, but drills use `autoStart={true}` and manage their own intervals
- Pausing the DrillTimer does NOT pause the game logic (flashing colors, moles appearing, etc.)
- No global `isPaused` state passed to drill components

## Technical Solution

### Phase 1: Global Pause System

**File: `src/components/tex-vision/ActiveDrillView.tsx`**

Add global pause state that propagates to all drills:

```text
// Add new state
const [isPaused, setIsPaused] = useState(false);

// Pass to drill components
<DrillComponent
  tier={tier}
  difficultyLevel={currentDifficultyLevel}
  onComplete={handleDrillComplete}
  onExit={onExit}
  onInteraction={() => { interactionCount.current += 1; }}
  isPaused={isPaused}  // NEW
  onPauseChange={setIsPaused}  // NEW
/>
```

**File: `src/components/tex-vision/ActiveDrillView.tsx` (interface update)**

```text
export interface DrillComponentProps {
  tier: string;
  difficultyLevel?: number;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
  onInteraction?: () => void;
  isPaused?: boolean;  // NEW
  onPauseChange?: (paused: boolean) => void;  // NEW
}
```

### Phase 2: Critical Fatigue Modal System

**File: `src/components/tex-vision/shared/FatigueIndicator.tsx`**

Add "Continue Anyway" functionality:

```text
interface FatigueIndicatorProps {
  level: number;
  onTakeBreak?: () => void;
  onEndSession?: () => void;
  onContinue?: () => void;  // NEW - allows athlete to continue despite fatigue
  showRecoverySuggestion?: boolean;
  isModal?: boolean;  // NEW - when true, renders as blocking overlay
  className?: string;
}
```

Add Continue button for critical state:

```text
{state === 'critical' && (
  <div className="flex items-center gap-2 mt-2">
    {onContinue && (
      <Button
        size="sm"
        variant="outline"
        onClick={onContinue}
        className="h-7 text-xs border-tex-vision-feedback/50 text-tex-vision-feedback hover:bg-tex-vision-feedback/10"
      >
        Continue Anyway
      </Button>
    )}
    {onEndSession && (
      <Button
        size="sm"
        variant="outline"
        onClick={onEndSession}
        className="h-7 text-xs border-tex-vision-text/50 text-tex-vision-text hover:bg-tex-vision-text/10"
      >
        <Moon className="h-3 w-3 mr-1" />
        End Session
      </Button>
    )}
  </div>
)}
```

**File: `src/components/tex-vision/ActiveDrillView.tsx`**

Auto-pause when critical fatigue is reached:

```text
// Watch for critical fatigue and auto-pause
useEffect(() => {
  if (fatigueLevel >= 80 && phase === 'playing' && !isPaused) {
    setIsPaused(true);  // Auto-pause on critical fatigue
  }
}, [fatigueLevel, phase, isPaused]);

// Handle continue despite fatigue
const handleContinueDespiteFatigue = useCallback(() => {
  setIsPaused(false);
}, []);
```

Update playing phase fatigue overlay to be modal-like:

```text
{/* Critical fatigue modal overlay */}
{fatigueLevel >= 80 && isPaused && (
  <div className="absolute inset-0 z-20 bg-black/60 flex items-center justify-center">
    <FatigueIndicator 
      level={fatigueLevel}
      onContinue={handleContinueDespiteFatigue}
      onEndSession={handleEndSessionFatigue}
      isModal={true}
      className="w-72 bg-[hsl(var(--tex-vision-primary-dark))]"
    />
  </div>
)}
```

### Phase 3: Drill-Level Pause Implementation

Each drill needs to respect the `isPaused` prop. Example for ColorFlashGame:

**File: `src/components/tex-vision/drills/ColorFlashGame.tsx`**

```text
interface ColorFlashGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
  isPaused?: boolean;  // NEW
}

// Update flash interval effect
useEffect(() => {
  if (isComplete || attempts >= totalAttempts || isPaused) return;  // Add isPaused check
  
  // ... rest of flash logic
}, [isComplete, attempts, totalAttempts, flashDuration, flashInterval, targetColor, isPaused]);
```

Apply same pattern to all drill files:
- WhackAMoleGame.tsx
- PatternSearchGame.tsx
- PeripheralVisionDrill.tsx
- ConvergenceDivergenceGame.tsx
- NearFarSightGame.tsx
- FollowTheTargetGame.tsx
- MeterTimingGame.tsx
- StroopChallengeGame.tsx
- MultiTargetTrackGame.tsx
- RapidSwitchGame.tsx
- DualTaskVisionGame.tsx
- ChaosGridGame.tsx
- SoftFocusGame.tsx

### Phase 4: Fix Done Button

**File: `src/components/tex-vision/ActiveDrillView.tsx`**

Add loading state and defensive coding:

```text
const [isCompletingDrill, setIsCompletingDrill] = useState(false);

// In conclusion phase
<Button
  onClick={async () => {
    if (completedResult && !isCompletingDrill) {
      setIsCompletingDrill(true);
      try {
        await onComplete(completedResult);
      } catch (error) {
        console.error('Error completing drill:', error);
        // Fallback: still try to exit
        onExit();
      }
    }
  }}
  disabled={isCompletingDrill || !completedResult}
  className="bg-[hsl(var(--tex-vision-feedback))] hover:bg-[hsl(var(--tex-vision-feedback))]/80 text-[hsl(var(--tex-vision-primary-dark))]"
  size="lg"
>
  {isCompletingDrill ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      Saving...
    </>
  ) : (
    t('texVision.drills.done', 'Done')
  )}
</Button>
```

### Phase 5: Optimize Confetti + Transition

**File: `src/components/tex-vision/ActiveDrillView.tsx`**

Defer heavy operations to allow UI to render first:

```text
const handleDrillComplete = useCallback(async (partialResult) => {
  // ... validation logic ...

  // Store result and transition to conclusion FIRST
  setCompletedResult(fullResult);
  
  // Check if drill has reflection questions
  const hasReflection = DRILL_REFLECTIONS[drillId]?.length > 0;
  if (hasReflection) {
    setPhase('reflection');
  } else {
    setPhase('conclusion');
  }

  // THEN trigger celebration (non-blocking)
  if (partialResult.accuracyPercent === 100) {
    setCelebrationType('perfect');
    setShowCelebration(true);
    // Use requestAnimationFrame to not block render
    requestAnimationFrame(() => triggerCelebration());
  } else if (pbCheckResult.isNewAccuracyRecord || pbCheckResult.isNewReactionRecord) {
    setCelebrationType('newPB');
    setShowCelebration(true);
    requestAnimationFrame(() => triggerCelebration());
  }
  // ... rest of logic
}, [...]);
```

### Phase 6: DrillTimer Pause State Sync

**File: `src/components/tex-vision/shared/DrillTimer.tsx`**

Add external pause control:

```text
interface DrillTimerProps {
  initialSeconds?: number;
  mode?: 'countdown' | 'countup';
  onComplete?: () => void;
  onTick?: (seconds: number) => void;
  fatigueLevel?: number;
  autoStart?: boolean;
  isPaused?: boolean;  // NEW - external pause control
  onPauseChange?: (paused: boolean) => void;  // NEW
  className?: string;
}

// Sync external pause state
useEffect(() => {
  if (isPaused !== undefined && isPaused !== !isRunning) {
    setIsRunning(!isPaused);
  }
}, [isPaused]);

// Notify parent of pause changes
const handlePause = useCallback(() => {
  setIsRunning(false);
  onPauseChange?.(true);
}, [onPauseChange]);

const handleStart = useCallback(() => {
  setIsRunning(true);
  setHasStarted(true);
  onPauseChange?.(false);
}, [onPauseChange]);
```

## Files to Modify

1. `src/components/tex-vision/ActiveDrillView.tsx` - Main drill orchestration
2. `src/components/tex-vision/shared/FatigueIndicator.tsx` - Add Continue option
3. `src/components/tex-vision/shared/DrillTimer.tsx` - External pause sync
4. `src/components/tex-vision/drills/ColorFlashGame.tsx` - Add isPaused
5. `src/components/tex-vision/drills/WhackAMoleGame.tsx` - Add isPaused
6. `src/components/tex-vision/drills/PatternSearchGame.tsx` - Add isPaused
7. `src/components/tex-vision/drills/PeripheralVisionDrill.tsx` - Add isPaused
8. `src/components/tex-vision/drills/ConvergenceDivergenceGame.tsx` - Add isPaused
9. `src/components/tex-vision/drills/NearFarSightGame.tsx` - Add isPaused
10. `src/components/tex-vision/drills/FollowTheTargetGame.tsx` - Add isPaused
11. `src/components/tex-vision/drills/MeterTimingGame.tsx` - Add isPaused
12. `src/components/tex-vision/drills/StroopChallengeGame.tsx` - Add isPaused
13. `src/components/tex-vision/drills/MultiTargetTrackGame.tsx` - Add isPaused
14. `src/components/tex-vision/drills/RapidSwitchGame.tsx` - Add isPaused
15. `src/components/tex-vision/drills/DualTaskVisionGame.tsx` - Add isPaused
16. `src/components/tex-vision/drills/ChaosGridGame.tsx` - Add isPaused
17. `src/components/tex-vision/drills/SoftFocusGame.tsx` - Add isPaused

## Expected Outcome

After implementation:

1. **Confetti + Checklist**: Phase transitions instantly, confetti animates independently
2. **Critical Fatigue**: Game auto-pauses, modal appears with "Continue Anyway" and "End Session" options
3. **Done Button**: Has loading state, defensive error handling, always navigates back
4. **Pause Button**: DrillTimer pause actually pauses all game logic
5. **Seamless E2E Flow**: Start drill -> Play (pause anytime) -> Complete -> Celebration -> Done -> Back to checklist
