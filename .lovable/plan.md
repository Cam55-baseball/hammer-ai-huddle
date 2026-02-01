

# Show Full Activity Details Without Abbreviation

## Problem

When viewing custom activity cards in the Past Days section, the activity description is truncated (cut off) in the header. Users cannot see the full description text even when the card is expanded.

---

## Root Cause

**File:** `src/components/vault/VaultDayRecapCard.tsx` (Lines 89-96)

```tsx
<div className="flex flex-col min-w-0">
  <span className="truncate">{template.title}</span>
  {template.description && (
    <span className="text-xs text-muted-foreground font-normal truncate">
      {template.description}  // <-- TRUNCATED!
    </span>
  )}
</div>
```

The `truncate` CSS class forces text to a single line with ellipsis (...), hiding any content that doesn't fit.

---

## Solution

Show the full description inside the expanded card content area, where there's room to display it without truncation.

### Changes to `src/components/vault/VaultDayRecapCard.tsx`

#### 1. Keep Header Preview (Truncated)
Leave the header as-is for a compact collapsed view - this is good UX for scanning multiple activities.

#### 2. Add Full Description in Expanded Content
Add a new section at the start of the `CollapsibleContent` that shows the complete, untruncated description.

**Insert after line 127** (inside CardContent, before Meal Items):

```tsx
{/* Full Description */}
{template.description && (
  <div className="space-y-1">
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <NotebookPen className="h-3 w-3" />
      <span>Description</span>
    </div>
    <p className="text-xs text-foreground whitespace-pre-line bg-muted/30 rounded-md p-2">
      {template.description}
    </p>
  </div>
)}
```

---

## Visual Result

### Collapsed Card (Header)
```
🎯 Activity Title
   "Activity description..."  ← truncated preview
```

### Expanded Card (Full View)
```
🎯 Activity Title
   "Activity description..."  ← truncated preview (header)
   
📝 Description
┌─────────────────────────────────────────────────┐
│ Full activity description text displayed here   │
│ including all details, multiple lines, and any  │
│ special instructions the user has written.      │
└─────────────────────────────────────────────────┘

🍽️ Items
[Chicken] [Rice]

💊 Supplements
[Creatine (5g)]
...
```

---

## Technical Notes

- Uses `whitespace-pre-line` to preserve line breaks in multi-line descriptions
- Uses `bg-muted/30` for a subtle background to visually separate the description from other content
- Places description at the top of expanded content since it provides context for the activity
- Uses the existing `NotebookPen` icon that's already imported in the file

