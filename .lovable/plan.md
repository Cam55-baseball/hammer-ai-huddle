
## Plan — Put Recap Engine Inside the Owner Dashboard

### What is wrong now
The Recap Engine already exists, but it lives inside the separate page `/admin/engine-settings`.  
That page has the **Recap Engine** tab, but the **Owner Dashboard has no navigation item that leads to it**.

So the real problem is not that the feature is missing.  
The problem is that the owner dashboard does not expose it.

---

## What to build

### 1. Add an Owner Dashboard navigation item for engine controls
Update the owner dashboard sidebar so it includes a new section item:

- **Engine Settings**

This will sit with the other owner tools like:
- Video Library
- Promo Engine
- Drill CMS
- Settings

This makes the feature discoverable where you actually expect it: inside the owner dashboard.

**Files**
- `src/components/owner/OwnerSidebar.tsx`
- `src/pages/OwnerDashboard.tsx`

**Changes**
- Add a new `OwnerSection` value like `engine-settings`
- Add a sidebar button labeled **Engine Settings**
- Add a matching label/description in `sectionLabels`
- Render the engine settings content when that section is active

---

### 2. Reuse the existing Recap/HIE settings UI instead of rebuilding it
Right now the engine settings UI already exists in `AdminEngineSettings.tsx`.

To avoid having two separate versions of the same control panel, extract the shared engine settings content into a reusable owner-facing component, then use it in both places:

- inside the Owner Dashboard
- inside `/admin/engine-settings`

**Files**
- `src/pages/AdminEngineSettings.tsx`
- new shared component, for example:
  - `src/components/owner/OwnerEngineSettingsPanel.tsx`

**Changes**
- Move the current tabbed engine settings UI into the shared component
- Keep the existing two tabs:
  - **HIE Engine**
  - **Recap Engine**
- Make `AdminEngineSettings.tsx` render that shared component
- Make `OwnerDashboard.tsx` render that same shared component under the new owner section

This keeps one source of truth.

---

### 3. Make it clear on mobile and desktop
Because you are often using the owner flow from a smaller viewport, the new navigation must work cleanly in both layouts.

**Desktop**
- Engine Settings appears in the left owner sidebar

**Mobile**
- Engine Settings appears in the owner dashboard slide-out menu
- Tapping it closes the drawer and opens the engine settings section immediately

No hidden route-hunting required.

---

### 4. Keep the existing route for backward compatibility
Do not remove `/admin/engine-settings`.

Keep it working, but treat it as a secondary/direct route.  
The primary place for owner use should now be the **Owner Dashboard**.

This preserves:
- existing bookmarks
- existing internal references
- current owner gating behavior

---

## Expected owner experience after this ships

### Desktop
1. Open **Owner Dashboard**
2. In the left owner navigation, click **Engine Settings**
3. See:
   - **HIE Engine**
   - **Recap Engine**
4. Click **Recap Engine** to manage recap logic

### Mobile
1. Open **Owner Dashboard**
2. Open the owner menu
3. Tap **Engine Settings**
4. The section opens directly
5. Tap **Recap Engine**

---

## Files to edit

**Edited**
- `src/components/owner/OwnerSidebar.tsx` — add Engine Settings nav item
- `src/pages/OwnerDashboard.tsx` — add new owner section and render engine settings there
- `src/pages/AdminEngineSettings.tsx` — switch to shared panel
- `src/components/owner/OwnerEngineSettingsPanel.tsx` — shared tabbed HIE/Recap settings UI

---

## Verification

1. Owner dashboard sidebar shows **Engine Settings**
2. Mobile owner drawer also shows **Engine Settings**
3. Clicking it opens the owner dashboard section without leaving the owner area
4. That section contains both tabs:
   - **HIE Engine**
   - **Recap Engine**
5. The **Recap Engine** tab loads the existing sliders, toggles, and JSON editor
6. Saving from the owner dashboard still writes to the same backend tables as before
7. `/admin/engine-settings` still works and shows the same shared UI
8. Non-owners never see the new owner dashboard nav item

---

## Result
After this change, the Recap Engine will no longer feel hidden or “somewhere else.”  
It will live where an owner would naturally look for it: **inside the Owner Dashboard**.
