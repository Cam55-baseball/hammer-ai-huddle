

# Add Red Border to Complete Pitcher Card

## What's Changing

The 5Tool Player and The Golden 2Way module cards on the dashboard display a solid primary-colored border when unlocked. The Complete Pitcher card currently has no border when unlocked. This fix adds the same border styling.

## Technical Detail

### File: `src/pages/Dashboard.tsx`

**Line 437**: Change the empty string `""` (when pitcher tier is unlocked) to `"border-primary/50 border-2"` to match the 5Tool Player card's styling.

Before:
```
!isTierUnlocked('pitcher') 
  ? "border-2 border-dashed border-primary/30 hover:border-primary/50" 
  : ""
```

After:
```
!isTierUnlocked('pitcher') 
  ? "border-2 border-dashed border-primary/30 hover:border-primary/50" 
  : "border-primary/50 border-2"
```

One line change in one file.
