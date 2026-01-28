

# Vault Performance Test Enhancement: Bilateral Metrics & Handedness

## Overview

Enhance the 6-week performance test entry in the Vault to:
1. Split SL Broad Jump into separate Left Leg and Right Leg measurements
2. Add throwing hand and batting side input fields to capture athlete laterality for proper metric interpretation

## Current State Analysis

### SL Broad Jump
- Currently stored as single metric `sl_broad_jump` in the `results` JSONB field
- Used in hitting, pitching, and throwing modules across baseball and softball
- Unit: inches, higher is better

### Handedness
- Profile table already has `throwing_hand` and `batting_side` columns
- Values: 'R' (Right), 'L' (Left), 'B' (Both/Switch)
- Displayed on profile page but NOT integrated with performance testing

## Solution Design

### Phase 1: Update Metric Configuration

**File: `src/components/vault/VaultPerformanceTestCard.tsx`**

Replace single `sl_broad_jump` with bilateral variants in all module lists:

```text
// From:
'sl_broad_jump',
'sl_lateral_broad_jump',

// To:
'sl_broad_jump_left',
'sl_broad_jump_right',
'sl_lateral_broad_jump',
```

Update TEST_METRICS configuration:

```text
// Remove single entry:
sl_broad_jump: { unit: 'in', higher_better: true },

// Add bilateral entries:
sl_broad_jump_left: { unit: 'in', higher_better: true },
sl_broad_jump_right: { unit: 'in', higher_better: true },
```

### Phase 2: Add Handedness Selectors

Add state for handedness in the card component:

```text
const [throwingHand, setThrowingHand] = useState<string>('');
const [battingSide, setBattingSide] = useState<string>('');
```

Add new props interface:

```text
interface VaultPerformanceTestCardProps {
  tests: PerformanceTest[];
  onSave: (testType: string, results: Record<string, number>, handedness?: { throwing?: string; batting?: string }) => Promise<{ success: boolean }>;
  sport?: 'baseball' | 'softball';
  subscribedModules?: string[];
  autoOpen?: boolean;
  recapUnlockedAt?: Date | null;
  userProfile?: { throwing_hand?: string; batting_side?: string }; // NEW
}
```

### Phase 3: UI Layout for Handedness

Add handedness selectors before the module selector:

```text
{/* Handedness Section */}
<div className="grid grid-cols-2 gap-3 p-2 rounded-lg bg-muted/20 border border-border/50">
  <div className="space-y-1">
    <Label className="text-xs flex items-center gap-1">
      <Hand className="h-3 w-3" />
      Throwing Hand
    </Label>
    <Select value={throwingHand} onValueChange={setThrowingHand}>
      <SelectTrigger className="h-8">
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="R">Right (R)</SelectItem>
        <SelectItem value="L">Left (L)</SelectItem>
        <SelectItem value="B">Both</SelectItem>
      </SelectContent>
    </Select>
  </div>
  
  <div className="space-y-1">
    <Label className="text-xs flex items-center gap-1">
      <Activity className="h-3 w-3" />
      Batting Side
    </Label>
    <Select value={battingSide} onValueChange={setBattingSide}>
      <SelectTrigger className="h-8">
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="R">Right (R)</SelectItem>
        <SelectItem value="L">Left (L)</SelectItem>
        <SelectItem value="B">Switch (Both)</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>
```

### Phase 4: UI Layout for Bilateral Jump Metrics

Group the left/right metrics visually:

```text
{/* Special handling for bilateral metrics */}
{metric.includes('_left') || metric.includes('_right') ? (
  <div className="col-span-2">
    <Label className="text-xs font-medium mb-2 block">
      SL Broad Jump
    </Label>
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Left Leg (in)</Label>
        <Input type="number" ... />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Right Leg (in)</Label>
        <Input type="number" ... />
      </div>
    </div>
  </div>
) : (
  // Standard single metric input
)}
```

### Phase 5: Update Data Storage

**File: `src/hooks/useVault.ts`**

Update `savePerformanceTest` to include handedness data in the results:

```text
const savePerformanceTest = useCallback(async (
  testType: string, 
  results: Record<string, number>,
  handedness?: { throwing?: string; batting?: string }
) => {
  // Include handedness in the results object for storage
  const enhancedResults = {
    ...results,
    _throwing_hand: handedness?.throwing || null,
    _batting_side: handedness?.batting || null,
  };
  
  const { error } = await supabase.from('vault_performance_tests').insert({
    user_id: user.id,
    test_type: testType,
    sport: 'baseball',
    module: testType,
    results: enhancedResults,
    previous_results: lastTest?.results || null,
    next_entry_date: nextEntryDate.toISOString().split('T')[0],
  });
  // ...
}, [user, performanceTests, fetchPerformanceTests]);
```

### Phase 6: Update Translations

**File: `src/i18n/locales/en.json` (and all other locale files)**

Add new metric translations:

```json
"metrics": {
  "sl_broad_jump": "SL Broad Jump",
  "sl_broad_jump_left": "SL Broad Jump (Left)",
  "sl_broad_jump_right": "SL Broad Jump (Right)",
  "throwing_hand": "Throwing Hand",
  "batting_side": "Batting Side"
}
```

### Phase 7: Update History Display

Update the recent tests display to show bilateral metrics grouped:

```text
{/* In recent tests section */}
{Object.entries(test.results)
  .filter(([key]) => !key.startsWith('_')) // Exclude metadata
  .map(([key, value]) => (
    // Group left/right metrics visually
  ))}
```

## Files to Modify

1. **`src/components/vault/VaultPerformanceTestCard.tsx`**
   - Update TEST_TYPES_BY_SPORT to replace `sl_broad_jump` with bilateral variants
   - Update TEST_METRICS configuration
   - Add handedness state and UI selectors
   - Group bilateral metrics in the input form
   - Update history display for grouped metrics

2. **`src/hooks/useVault.ts`**
   - Update savePerformanceTest signature to accept handedness
   - Store handedness as metadata in results JSONB

3. **`src/pages/Vault.tsx`**
   - Pass user profile handedness to VaultPerformanceTestCard
   - Update handleSavePerformanceTest to forward handedness

4. **Translation files** (8 files):
   - `src/i18n/locales/en.json`
   - `src/i18n/locales/es.json`
   - `src/i18n/locales/fr.json`
   - `src/i18n/locales/de.json`
   - `src/i18n/locales/ja.json`
   - `src/i18n/locales/ko.json`
   - `src/i18n/locales/zh.json`
   - `src/i18n/locales/nl.json`

## Database Considerations

No schema changes required - the `results` JSONB column already supports storing any key-value pairs. The bilateral metrics and handedness metadata will be stored within the existing structure:

```json
{
  "sl_broad_jump_left": 48,
  "sl_broad_jump_right": 52,
  "ten_yard_dash": 1.85,
  "_throwing_hand": "R",
  "_batting_side": "L"
}
```

## Expected Outcome

After implementation, athletes will:

1. See separate input fields for Left Leg and Right Leg SL Broad Jump measurements
2. Be able to select their throwing hand (R/L/Both) and batting side (R/L/Switch)
3. Have this handedness context stored with each performance test for proper analysis
4. See grouped bilateral metrics in their test history

This enables more precise athletic assessment, particularly for identifying leg strength imbalances and understanding how laterality affects performance metrics.

