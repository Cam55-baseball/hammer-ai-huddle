## Fix Demo Duplicates + Add Smart Back Button

### 1. Remove duplicate Iron Bambino under 5 Tool → Player Care

The `demo_registry` table contains two entries for Iron Bambino under the 5 Tool tier:
- `iron-bambino` under `5tool-hitting-power` ✅ (keep)
- `5tool-iron-bambino` under `5tool-player-care` ❌ (remove)

**Migration**: deactivate (`is_active = false`) the `5tool-iron-bambino` row so it disappears from the Player Care tab without losing historical event data referencing it.

(Note: there's also a similar-looking duplicate `5tool-vault` + `vault-care` both under Player Care — leaving alone since the user only flagged Iron Bambino. Happy to clean those up too if you want.)

### 2. Smart "Back" button in demo header

Currently `DemoLayout` shows only a "Demo Home" button when `showBack` is true, which always navigates to `/demo`. Replace it with a true browser-history back button that returns to whichever page the user came from (category page, tier page, Start Here runner, etc.), and falls back to `/demo` if there's no history entry within the demo flow.

**Implementation in `src/components/demo/DemoLayout.tsx`**:
- Use `navigate(-1)` for back navigation.
- Track whether the user entered the demo directly (e.g. deep link) by checking `window.history.state?.idx` (React Router's history index). If `idx === 0`, fall back to `navigate('/demo')` so users never get bounced out of the app.
- Keep the label as "Back" with the chevron icon; if at the entry point, label it "Demo Home".

### Files touched
- New SQL migration: deactivate `5tool-iron-bambino`.
- `src/components/demo/DemoLayout.tsx`: replace hardcoded `/demo` navigation with history-aware back logic.

No other components need changes — `DemoCategory`, `DemoSubmodule`, and `DemoTier` all already pass `showBack` to `DemoLayout`.
