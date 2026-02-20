
# Two-Part Plan: Reset Reagan's Physio Profile + Add Edit Mode to Physio Setup

## Part 1 — Reset Reagan Niederhaus' Physio Profile

Reagan Niederhaus (the account with a completed physio profile) has:
- `user_id`: `57b007e3-5faa-40fa-b9b8-0858a134b4b5`
- `physio_id`: `39e24da3-bf48-438a-b240-046df47d3860`
- `setup_completed: true`
- Missing `date_of_birth` and `biological_sex` (filled in before the new columns were added)

The reset is a **data update** (not a schema change), so it runs directly against the database:

```sql
UPDATE public.physio_health_profiles
SET setup_completed = false
WHERE id = '39e24da3-bf48-438a-b240-046df47d3860';
```

This will cause the intake dialog to auto-open the next time Reagan visits the Vault, prompting them to complete the setup again with the new DOB and biological sex fields.

---

## Part 2 — Edit Mode for Physio Profile (Post-Setup)

Users should be able to re-open and edit their health setup after completing it initially. The DOB field is **locked after first save** (as specified — birthday cannot be changed), but all other fields are editable.

### Changes Required

#### 1. `src/components/physio/PhysioHealthIntakeDialog.tsx`

**Add an `isEditMode` prop:**
```ts
interface PhysioHealthIntakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditMode?: boolean;
}
```

**Pre-populate state from existing profile when in edit mode:**
The dialog currently initialises all state to empty values. When `isEditMode === true`, use a `useEffect` to hydrate state from the `profile` object returned by `usePhysioProfile()` as soon as the dialog opens.

Fields pre-populated:
- Step 1: `bloodType`, `dietaryStyle`, `allergiesText`, `intolerancesText`
- Step 2: `medicationsText`, `conditions`, `injuryText`, `supplementsText`
- Step 3: `biologicalSex`, `enableAdult` (from `adultFeaturesEnabled`), `contraceptiveUse`, `contraceptiveType`
- Step 3: `dobDate` shown as **read-only display** (locked, cannot be changed)

**DOB field in edit mode:**
Instead of the `Popover` date picker, render a static read-only display:
```tsx
{isEditMode ? (
  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
    <span className="text-sm">{profile?.date_of_birth ? format(new Date(profile.date_of_birth), 'MMMM d, yyyy') : 'Not set'}</span>
    <span className="ml-auto text-xs text-muted-foreground">Cannot be changed</span>
  </div>
) : (
  // ... existing Popover date picker
)}
```

**Dialog title and description updated for edit mode:**
- Title: "Edit Health Profile" (vs "Physio Health Setup")
- Description: "Update your health information. Your date of birth cannot be changed."

**Save button label updated:**
- Initial setup: "Complete Setup"
- Edit mode: "Save Changes"

**`handleSaveAndClose` in edit mode:** Does NOT include `setup_completed: true` in the payload (it's already true and should stay that way).

---

#### 2. `src/pages/Vault.tsx`

Add a second state variable and button to trigger edit mode:

```ts
const [editPhysioOpen, setEditPhysioOpen] = useState(false);
```

Add a second `PhysioHealthIntakeDialog` instance (or reuse the same one with a combined open/edit state):
```tsx
<PhysioHealthIntakeDialog
  open={intakeOpen || editPhysioOpen}
  onOpenChange={(v) => { setIntakeOpen(v); setEditPhysioOpen(v); }}
  isEditMode={editPhysioOpen && !intakeOpen}
/>
```

**"Edit Health Profile" button placement:** Add a small "Edit Health Profile" button in the Vault's physio section (near the `PhysioRegulationBadge` or as a settings gear icon), visible only when `setupCompleted === true`:
```tsx
{setupCompleted && (
  <button onClick={() => setEditPhysioOpen(true)} className="...">
    <Settings className="h-4 w-4" />
    Edit Health Profile
  </button>
)}
```

---

## Implementation Order

1. **Database reset** — set `setup_completed = false` for Reagan Niederhaus' physio profile (data update, immediate)
2. **`PhysioHealthIntakeDialog.tsx`** — add `isEditMode` prop, pre-population `useEffect`, DOB lock, updated labels
3. **`Vault.tsx`** — add edit state variable, second dialog trigger, "Edit Health Profile" button near the regulation badge

## Technical Notes

- The DOB lock is enforced at the UI level only (the field becomes a read-only display in edit mode). The `saveProfile` upsert in edit mode simply omits `date_of_birth` from the payload so it is never overwritten.
- `biological_sex` **is** editable post-setup, as a user may have entered it incorrectly or it may change.
- `adult_features_enabled` in edit mode: if the user had it enabled and removes it (taps "Cancel Adult Tracking"), the flag is set back to `false` on save.
- The `isEditMode` pre-population `useEffect` only runs when the dialog opens (`open === true`) and `isEditMode === true`, preventing stale state from a previous session overwriting a new first-time setup.
- Arrays (allergies, conditions, etc.) are joined with `', '` for display in text inputs and split back on save — same logic as the initial flow.
