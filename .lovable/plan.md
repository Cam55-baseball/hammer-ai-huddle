

# Base Stealing Module — Final Tune-Ups

## Changes Required

### 1. Front Camera Toggle (`SessionSetup.tsx` + `LiveRepRunner.tsx`)

**SessionSetup.tsx**: Add `cameraFacing: 'environment' | 'user'` to `LeadConfig` interface, defaulting to `'environment'`. Add a toggle in the Camera Position card: "Rear Camera / Front Camera".

**LiveRepRunner.tsx**: Read `config.cameraFacing` and pass it to `getUserMedia` as `facingMode`. During setup phase, show the camera preview visible (not `opacity-0`) so users can confirm they're in frame. Hide preview once countdown starts (existing behavior).

### 2. Holder Position Fix — Add 3B for Stealing Home (`SessionSetup.tsx`)

Line 52-56: Update `holderOptions` logic. When `targetBase === 'home'`, change from `['Nobody']` to `['3B', 'Nobody']`.

```
const holderOptions = config.targetBase === '2nd'
  ? ['1B', 'Nobody']
  : config.targetBase === '3rd'
  ? ['2B', 'SS', 'Nobody']
  : config.targetBase === 'home'
  ? ['3B', 'Nobody']
  : ['Nobody'];
```

### 3. Signal Explanation Card (`SessionSetup.tsx`)

Add a new instructional `Card` between the "Signal & Difficulty" card and the "Start Session" button. Title: **"Reaction Signal Rules"**. Content depends on `config.signalMode`:

- **Colors**: Green = Steal / Go, Red = Return, Yellow = Return, Blue = Return (with colored dots/badges)
- **Numbers**: Even = Steal, Odd = Return

Clean, simple, youth-friendly layout with color-coded badges.

### 4. 5Tool Player — Add Base Stealing Tile (`FiveToolPlayer.tsx`)

Add a new tile to the `tiles` array:
```
{
  key: "base-stealing",
  icon: Zap,
  label: "Base Stealing",
  description: "Reaction training for explosive steals",
  getRoute: () => "/base-stealing",
}
```

This tile will only render when `selectedSport === 'baseball'` (add conditional filter in the render).

### 5. 5Tool Player Sidebar — Add Base Stealing (`AppSidebar.tsx`)

Line 203-209: Add to the `5tool` subModules array (baseball only):
```
...(selectedSport === 'baseball' ? [{
  title: 'Base Stealing',
  url: '/base-stealing',
  icon: Zap,
  description: 'Reaction training for explosive steals'
}] : [])
```

Also add the same entry to the Golden 2Way subModules (line 220-228) since it already has base stealing on its landing page.

### 6. Golden 2Way Sidebar — Already Has Landing Tile, Add Sidebar Entry (`AppSidebar.tsx`)

Add same base stealing sub-module entry to the golden2way section (line 220-228), gated to baseball.

---

## Files Modified

| File | Changes |
|------|---------|
| `SessionSetup.tsx` | Add `cameraFacing` to LeadConfig, camera toggle UI, fix holder options for Home, add signal explanation card |
| `LiveRepRunner.tsx` | Use `config.cameraFacing` for getUserMedia, show preview during idle/setup |
| `FiveToolPlayer.tsx` | Add Base Stealing tile (baseball only) |
| `AppSidebar.tsx` | Add Base Stealing sub-module to 5tool and golden2way sidebar sections (baseball only) |

