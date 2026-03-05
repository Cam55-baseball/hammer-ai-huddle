

# Add Game Hub Navigation

## Changes

### 1. `src/components/AppSidebar.tsx`
- Import `Gamepad2` icon (already available from lucide-react)
- Add a **Game Hub** section between "Practice Intelligence" (ends line 634) and "Training Modules" (starts line 636)
- New `SidebarGroup` with label "Game Hub" containing one item: `{ title: 'Game Hub', url: '/game-scoring', icon: Gamepad2 }`
- Follows the same rendering pattern as Practice Intelligence items

### 2. `src/pages/Dashboard.tsx`
- Add a Game Hub card to the dashboard so users can navigate to `/game-scoring` from the main view
- Uses the same card pattern as existing dashboard navigation cards

### Files

| File | Change |
|------|--------|
| `src/components/AppSidebar.tsx` | Add Game Hub sidebar group between Practice Intelligence and Training Modules |
| `src/pages/Dashboard.tsx` | Add Game Hub navigation card |

