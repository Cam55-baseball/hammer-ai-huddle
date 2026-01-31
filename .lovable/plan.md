
# Fix: Remove Horizontal Scrolling for Pain Scales on Mobile

## Problem Analysis

The individual pain scales for each selected body area cause horizontal scrolling on mobile devices. The root causes are:

| Issue | Location | Impact |
|-------|----------|--------|
| No overflow containment | TenPointScale container | Scale transforms (105%) can overflow |
| Fixed min-height without width control | Grid buttons | Buttons can grow beyond container |
| Nested padding accumulation | Dialog → Section → TenPointScale | Reduces available width on narrow screens |
| Label text wrapping issues | Header label | Long body area names can push content |

## Solution Overview

Update the `TenPointScale.tsx` component with mobile-optimized constraints:

1. **Add overflow containment** - Prevent scale transforms from causing scroll
2. **Ensure buttons fill grid cells** - Add `w-full` to buttons
3. **Prevent flex overflow** - Add `min-w-0` to grid container
4. **Reduce compact mode padding** - Less padding for stacked pain scales
5. **Truncate long area labels** - Prevent text from expanding container

---

## Technical Changes

### File: `src/components/vault/quiz/TenPointScale.tsx`

#### Change 1: Add overflow-hidden to outer container

Prevents the `scale-105` transform on selected buttons from causing horizontal scroll.

**Current (line 69-72):**
```tsx
<div className={cn(
  "space-y-3 bg-card/50 rounded-2xl border border-border/50",
  compact ? "p-3" : "p-4"
)}>
```

**Updated:**
```tsx
<div className={cn(
  "space-y-3 bg-card/50 rounded-2xl border border-border/50 overflow-hidden",
  compact ? "p-2 sm:p-3" : "p-3 sm:p-4"
)}>
```

#### Change 2: Constrain header to prevent label overflow

**Current (line 73-90):**
```tsx
<div className="flex items-center justify-between">
  <Label className={cn(
    "flex items-center gap-2 font-semibold",
    compact ? "text-sm" : "text-base"
  )}>
    {icon}
    {label}
  </Label>
  ...
</div>
```

**Updated:**
```tsx
<div className="flex items-center justify-between gap-2 min-w-0">
  <Label className={cn(
    "flex items-center gap-2 font-semibold min-w-0 truncate",
    compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"
  )}>
    {icon}
    <span className="truncate">{label}</span>
  </Label>
  ...
</div>
```

#### Change 3: Optimize grid for mobile

**Current (line 93-108):**
```tsx
<div className="grid grid-cols-5 gap-1.5">
  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
    <button
      key={num}
      type="button"
      onClick={() => handleClick(num)}
      className={cn(
        "rounded-lg font-bold text-sm transition-all duration-200 border-2",
        compact ? "min-h-[36px]" : "min-h-[40px]",
        ...
      )}
    >
      {num}
    </button>
  ))}
</div>
```

**Updated:**
```tsx
<div className="grid grid-cols-5 gap-1 sm:gap-1.5 min-w-0">
  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
    <button
      key={num}
      type="button"
      onClick={() => handleClick(num)}
      className={cn(
        "w-full rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 border-2",
        compact ? "min-h-[32px] sm:min-h-[36px]" : "min-h-[36px] sm:min-h-[40px]",
        ...
      )}
    >
      {num}
    </button>
  ))}
</div>
```

#### Change 4: Reduce level label badge padding

**Current (line 82-88):**
```tsx
<span className={cn(
  "font-bold px-3 py-1 rounded-full bg-background",
  compact ? "text-xs" : "text-sm",
  getLevelColor ? getLevelColor(value) : defaultGetLevelColor(value)
)}>
  {getLevelLabel(value)}
</span>
```

**Updated:**
```tsx
<span className={cn(
  "font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-background whitespace-nowrap flex-shrink-0",
  compact ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm",
  getLevelColor ? getLevelColor(value) : defaultGetLevelColor(value)
)}>
  {getLevelLabel(value)}
</span>
```

---

## Visual Comparison

| Aspect | Before | After |
|--------|--------|-------|
| Container padding | Fixed `p-3` or `p-4` | Responsive `p-2 sm:p-3` or `p-3 sm:p-4` |
| Grid gap | Fixed `gap-1.5` | Responsive `gap-1 sm:gap-1.5` |
| Button height | `min-h-[36px]` compact | `min-h-[32px] sm:min-h-[36px]` compact |
| Button width | Implicit | Explicit `w-full` |
| Font size | Fixed `text-sm` | Responsive `text-xs sm:text-sm` |
| Label overflow | Can expand | Truncated with `truncate` |
| Scale overflow | Causes scroll | Contained with `overflow-hidden` |

---

## Mobile Layout After Fix

On a 320px wide screen (iPhone SE), the pain scales will:
- Fit within the dialog with no horizontal scroll
- Display 5 buttons per row in a 2-row grid
- Show truncated area labels if they're too long
- Maintain touch targets of at least 32px height

---

## Files Changed

| File | Changes |
|------|---------|
| `src/components/vault/quiz/TenPointScale.tsx` | Responsive padding, grid gap, button sizes, overflow containment |

---

## Validation

After implementation, verify:
- [ ] No horizontal scroll on iPhone SE (320px)
- [ ] No horizontal scroll on iPhone 12 (390px)
- [ ] Selected button scale effect stays within bounds
- [ ] Long area labels are truncated properly
- [ ] Touch targets remain usable (min 32px)
- [ ] Pain level badge displays correctly
