

# Show Custom Field Notes in Past Days Viewer

## Problem

When viewing past days in the Vault, the notes attached to custom fields (like "Fascia Toe Raises" with notes "8SL Toe raises - Marble in second two Or foot Toss (20) 135lbs") are not being displayed. The current implementation only shows the field label and value, ignoring the crucial `notes` field.

---

## Evidence

### Database Data Example
The user's "Hammers Return to Form" activity has custom fields with detailed notes:

| Field Label | Notes |
|-------------|-------|
| Fascia Toe Raises | 8SL Toe raises - Marble in second two Or foot Toss (20) 135lbs |
| Ankle Tens Unit | Over Top of ankle, Behind scar above ankle, 10Mins |
| Hanging | 45Secs - X2 Twist toward right side glide rolling |
| Nerve Glides | Brachial nerve glides, UCL nerve & Eye glass stretch, etc. |

### Type Definition
```typescript
// src/types/customActivity.ts (line 82-88)
export interface CustomField {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'number' | 'time' | 'checkbox';
  notes?: string;  // <-- This exists but is NOT displayed!
}
```

### Current UI Code (Problem)
```tsx
// VaultDayRecapCard.tsx (lines 218-231)
{customFields.map((field) => (
  <Badge key={field.id} variant="outline" className="text-xs py-0.5 px-2">
    {field.label}
    {field.value && field.type !== 'checkbox' && (
      <span className="text-muted-foreground ml-1">: {field.value}</span>
    )}
  </Badge>  // <-- Notes are completely ignored!
))}
```

---

## Solution

Update the custom fields display to show notes, following the same pattern used for exercise notes (which already works).

### File: `src/components/vault/VaultDayRecapCard.tsx`

#### Change Custom Fields Display (lines 218-231)

Replace the current Badge-only display with a structure that shows notes below each field:

**From:**
```tsx
<div className="flex flex-wrap gap-1.5">
  {customFields.map((field) => (
    <Badge 
      key={field.id} 
      variant="outline" 
      className="text-xs py-0.5 px-2"
    >
      {field.label}
      {field.value && field.type !== 'checkbox' && (
        <span className="text-muted-foreground ml-1">: {field.value}</span>
      )}
    </Badge>
  ))}
</div>
```

**To:**
```tsx
<div className="space-y-1">
  {customFields.map((field) => (
    <div key={field.id} className="flex flex-col">
      <Badge 
        variant="outline" 
        className="text-xs py-0.5 px-2 w-fit"
      >
        {field.label}
        {field.value && field.type !== 'checkbox' && (
          <span className="text-muted-foreground ml-1">: {field.value}</span>
        )}
      </Badge>
      {field.notes && (
        <span className="text-muted-foreground text-[10px] italic ml-2 mt-0.5 whitespace-pre-line">
          "{field.notes}"
        </span>
      )}
    </div>
  ))}
</div>
```

---

## Visual Change

### Before
```
Logged
[Fascia Toe Raises] [Ankle Tens Unit] [Hanging]
```

### After
```
Logged
[Fascia Toe Raises]
  "8SL Toe raises - Marble in second two Or foot Toss (20) 135lbs"
[Ankle Tens Unit]
  "Over Top of ankle, Behind scar above ankle, 10Mins"
[Hanging]
  "45Secs - X2 Twist toward right side glide rolling"
```

---

## Technical Notes

- Uses `whitespace-pre-line` to preserve line breaks in multi-line notes
- Matches the existing exercise notes styling (italic, muted, 10px font)
- Adds `w-fit` to Badge so it doesn't stretch to full width
- Changes container from `flex flex-wrap` to `space-y-1` for vertical layout with notes

