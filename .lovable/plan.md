

# Mobile Optimization for Body Map Pain Selector

## Problem Analysis

The current body map implementation has several mobile usability challenges:

1. **Small Tap Targets**: SVG zones are constrained to 180px max-width, making individual body parts (especially granular ones like ankle inside/outside, quad inner/outer) very small on phone screens
2. **Dense Zone Layout**: With 60+ anatomical zones across 4 views, small screens struggle to provide adequate touch target sizes (Apple recommends minimum 44x44pt)
3. **No Zoom Capability**: Users cannot pinch-to-zoom to see or select smaller zones more accurately
4. **Fixed Positioning**: The body map doesn't expand to use available mobile screen space effectively
5. **View Tab Crowding**: The Front/Back/L Side/R Side tabs may feel cramped on narrow screens

## Mobile Optimization Strategy

### Key Improvements

| Issue | Solution |
|-------|----------|
| Small tap targets | Increase SVG size on mobile, add zoom/pan capability |
| Dense zones | Implement pinch-to-zoom with reset button |
| Limited space | Make body map full-width on mobile devices |
| Accidental taps | Add visual zoom indicator and confirmation feedback |
| Tab navigation | Make tabs touch-friendly with larger hit areas |

---

## Technical Implementation

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/vault/quiz/BodyMapSelector.tsx` | Add mobile detection, zoom state, larger mobile layout |
| `src/components/vault/quiz/body-maps/BodyMapFront.tsx` | Increase zone sizes, add touch-action handling |
| `src/components/vault/quiz/body-maps/BodyMapBack.tsx` | Same zone size improvements |
| `src/components/vault/quiz/body-maps/BodyMapLeftSide.tsx` | Same zone size improvements |
| `src/components/vault/quiz/body-maps/BodyMapRightSide.tsx` | Same zone size improvements |

### 1. Enhanced Mobile Layout in BodyMapSelector

Add mobile-responsive container with pinch-to-zoom:

```typescript
import { useIsMobile } from '@/hooks/use-mobile';

export function BodyMapSelector({ selectedAreas, onChange }: BodyMapSelectorProps) {
  const isMobile = useIsMobile();
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Pinch-to-zoom handling for mobile
  const handleTouchStart = (e: React.TouchEvent) => { /* track initial touch */ };
  const handleTouchMove = (e: React.TouchEvent) => { /* calculate zoom/pan */ };
  const handleTouchEnd = () => { /* finalize gesture */ };

  const resetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="space-y-3">
      {/* View Tabs - Larger on mobile */}
      <div className="flex justify-center">
        <div className={cn(
          "inline-flex rounded-lg bg-muted/50 p-1",
          isMobile && "w-full justify-between"
        )}>
          {(['front', 'back', 'left', 'right'] as BodyView[]).map(view => (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              className={cn(
                "rounded-md transition-colors font-medium",
                // Larger touch targets on mobile
                isMobile 
                  ? "flex-1 px-2 py-2 text-sm min-h-[44px]" 
                  : "px-3 py-1 text-xs",
                activeView === view
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {VIEW_LABELS[view]}
            </button>
          ))}
        </div>
      </div>

      {/* Zoom Controls - Mobile only */}
      {isMobile && zoomLevel > 1 && (
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={resetZoom}
            className="text-xs gap-1"
          >
            <ZoomOut className="h-3 w-3" />
            Reset Zoom
          </Button>
        </div>
      )}

      {/* Zoomable Body Map Container */}
      <div 
        ref={containerRef}
        className={cn(
          "flex justify-center overflow-hidden rounded-lg",
          isMobile && "touch-pan-x touch-pan-y bg-muted/20 p-2"
        )}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
      >
        <div 
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            transformOrigin: 'center center',
            transition: zoomLevel === 1 ? 'transform 0.2s ease' : 'none'
          }}
          className={cn(
            // Larger SVG container on mobile
            isMobile ? "w-full max-w-[280px]" : "max-w-[180px]"
          )}
        >
          {activeView === 'front' && <BodyMapFront ... />}
          {/* other views */}
        </div>
      </div>

      {/* Mobile hint when zoomed out */}
      {isMobile && zoomLevel === 1 && (
        <p className="text-xs text-muted-foreground text-center">
          Pinch to zoom for precise selection
        </p>
      )}

      {/* Selected areas chips - scrollable on mobile */}
      {selectedAreas.length > 0 && (
        <div className={cn(
          "flex gap-1.5 justify-center",
          isMobile 
            ? "overflow-x-auto pb-2 -mx-2 px-2 flex-nowrap" 
            : "flex-wrap max-h-24 overflow-y-auto"
        )}>
          {/* chips */}
        </div>
      )}
    </div>
  );
}
```

### 2. Larger SVG Zones for Mobile

Update all SVG view components to have proportionally larger tap targets:

```typescript
// BodyMapFront.tsx - Update SVG sizing
export function BodyMapFront({ selectedAreas, onToggle }: BodyMapFrontProps) {
  return (
    <svg
      viewBox="0 0 200 380"
      // Remove fixed max-width - let parent container control sizing
      className="w-full h-auto"
      role="group"
      aria-label="Front body view for pain selection"
      // Prevent accidental browser zoom on double-tap
      style={{ touchAction: 'manipulation' }}
    >
      {/* Zones remain same coordinates but render larger due to container */}
    </svg>
  );
}
```

### 3. Enhanced Touch Feedback

Add stronger visual and haptic feedback on mobile:

```typescript
const toggleArea = (areaId: string) => {
  // Longer vibration on mobile for better feedback
  if (navigator.vibrate) {
    navigator.vibrate(isMobile ? 20 : 10);
  }
  // ... rest of toggle logic
};

// In SVG zone classes - larger stroke on selection for mobile visibility
const getZoneClasses = (areaId: string) =>
  cn(
    'cursor-pointer transition-all duration-150 outline-none',
    isSelected(areaId)
      ? 'fill-red-500/40 stroke-red-500 stroke-[3] animate-pulse-subtle'
      : 'fill-muted/50 stroke-muted-foreground/30 stroke-[1.5] hover:fill-muted-foreground/20'
  );
```

### 4. Pinch-to-Zoom Implementation

Track touch gestures for zoom and pan:

```typescript
const [touches, setTouches] = useState<{ distance: number; center: { x: number; y: number } } | null>(null);

const getDistance = (t1: Touch, t2: Touch) => 
  Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

const getCenter = (t1: Touch, t2: Touch) => ({
  x: (t1.clientX + t2.clientX) / 2,
  y: (t1.clientY + t2.clientY) / 2
});

const handleTouchStart = (e: React.TouchEvent) => {
  if (e.touches.length === 2) {
    const distance = getDistance(e.touches[0], e.touches[1]);
    const center = getCenter(e.touches[0], e.touches[1]);
    setTouches({ distance, center });
  }
};

const handleTouchMove = (e: React.TouchEvent) => {
  if (e.touches.length === 2 && touches) {
    const newDistance = getDistance(e.touches[0], e.touches[1]);
    const scale = newDistance / touches.distance;
    setZoomLevel(prev => Math.min(Math.max(prev * scale, 1), 3)); // Clamp 1x-3x
    
    // Update touch reference for continuous gesture
    setTouches({ 
      distance: newDistance, 
      center: getCenter(e.touches[0], e.touches[1]) 
    });
  }
};

const handleTouchEnd = () => {
  setTouches(null);
};
```

### 5. Mobile-Optimized Selected Chips

Horizontal scrolling chip layout for mobile:

```typescript
{selectedAreas.length > 0 && (
  <div className={cn(
    "gap-1.5 justify-center",
    isMobile 
      ? "flex overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory" 
      : "flex flex-wrap max-h-24 overflow-y-auto"
  )}>
    {selectedAreas.map((areaId) => (
      <button
        key={areaId}
        type="button"
        onClick={() => toggleArea(areaId)}
        className={cn(
          "rounded-full font-medium bg-destructive/20 text-destructive border border-destructive/50",
          isMobile 
            ? "px-3 py-1.5 text-sm whitespace-nowrap snap-start min-h-[36px]" 
            : "px-2 py-0.5 text-xs"
        )}
      >
        {getBodyAreaLabel(areaId)}
        <span className="ml-1">x</span>
      </button>
    ))}
  </div>
)}
```

---

## Summary of Mobile Enhancements

| Feature | Benefit |
|---------|---------|
| **Larger SVG (280px on mobile)** | ~55% more screen space for body zones |
| **Full-width view tabs** | 44px+ touch targets meet Apple guidelines |
| **Pinch-to-zoom (1x-3x)** | Precise selection of small zones like ankle inside/outside |
| **Reset zoom button** | Easy return to full-body view |
| **Horizontal chip scroll** | See all selections without vertical overflow |
| **Enhanced haptic feedback** | 20ms vibration confirms each tap |
| **Larger selection strokes** | 3px strokes more visible on small screens |
| **Touch-action: manipulation** | Prevents accidental browser zoom |

These optimizations ensure athletes can accurately log pain in specific body areas like "Left Hamstring (Inner)" or "Right Ankle (Inside)" even on the smallest phone screens, while maintaining the full granularity of the 60+ zone system.

