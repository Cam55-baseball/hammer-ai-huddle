import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ZoomOut, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { BodyMapFront } from './body-maps/BodyMapFront';
import { BodyMapBack } from './body-maps/BodyMapBack';
import { BodyMapLeftSide } from './body-maps/BodyMapLeftSide';
import { BodyMapRightSide } from './body-maps/BodyMapRightSide';
import { getBodyAreaLabel, type BodyView } from './body-maps/bodyAreaDefinitions';

interface BodyMapSelectorProps {
  selectedAreas: string[];
  onChange: (areas: string[]) => void;
}

const VIEW_LABELS: Record<BodyView, string> = {
  front: 'Front',
  back: 'Back',
  left: 'L Side',
  right: 'R Side',
};

interface TouchState {
  initialDistance: number;
  initialZoom: number;
  center: { x: number; y: number };
  isPinching: boolean;
}

export function BodyMapSelector({ selectedAreas, onChange }: BodyMapSelectorProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [activeView, setActiveView] = useState<BodyView>('front');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const touchRef = useRef<TouchState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getDistance = (t1: React.Touch, t2: React.Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const getCenter = (t1: React.Touch, t2: React.Touch) => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = getDistance(e.touches[0], e.touches[1]);
      const center = getCenter(e.touches[0], e.touches[1]);
      touchRef.current = {
        initialDistance: distance,
        initialZoom: zoomLevel,
        center,
        isPinching: true,
      };
      setIsPinching(true);
      if (navigator.vibrate) navigator.vibrate(10);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchRef.current?.isPinching) {
      e.preventDefault();
      const newDistance = getDistance(e.touches[0], e.touches[1]);
      // Calculate scale relative to INITIAL distance, not previous frame
      const scale = newDistance / touchRef.current.initialDistance;
      // Apply scale to INITIAL zoom level, clamped 1-3x
      const newZoom = Math.min(Math.max(touchRef.current.initialZoom * scale, 1), 3);
      setZoomLevel(newZoom);
      
      // Haptic feedback at zoom thresholds
      if (navigator.vibrate) {
        const oldZoom = zoomLevel;
        if ((oldZoom < 2 && newZoom >= 2) || (oldZoom >= 2 && newZoom < 2) ||
            (oldZoom < 3 && newZoom >= 3) || (oldZoom >= 3 && newZoom < 3) ||
            (oldZoom > 1 && newZoom <= 1.05)) {
          navigator.vibrate(15);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchRef.current) {
      touchRef.current = null;
      setIsPinching(false);
    }
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    if (navigator.vibrate) navigator.vibrate(20);
  };

  const zoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const toggleArea = (areaId: string) => {
    if (navigator.vibrate) navigator.vibrate(isMobile ? 20 : 10);
    if (selectedAreas.includes(areaId)) {
      onChange(selectedAreas.filter((a) => a !== areaId));
    } else {
      onChange([...selectedAreas, areaId]);
    }
  };

  const zoomPercent = Math.round(zoomLevel * 100);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        {t('vault.quiz.pain.locationLabel', 'Localized pain today?')}
      </p>

      {/* View Selector Tabs - Larger on mobile */}
      <div className="flex justify-center">
        <div
          className={cn(
            'inline-flex rounded-lg bg-muted/50 p-1',
            isMobile && 'w-full justify-between'
          )}
        >
          {(['front', 'back', 'left', 'right'] as BodyView[]).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              className={cn(
                'rounded-md transition-colors font-medium',
                isMobile
                  ? 'flex-1 px-2 py-2 text-sm min-h-[44px]'
                  : 'px-3 py-1 text-xs',
                activeView === view
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {VIEW_LABELS[view]}
            </button>
          ))}
        </div>
      </div>

      {/* Zoom Controls - Mobile only, enhanced visibility */}
      {isMobile && zoomLevel > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={zoomOut}
            className="text-xs gap-1 min-h-[40px] px-3"
            type="button"
          >
            <Minus className="h-4 w-4" />
            Zoom Out
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={resetZoom}
            className="text-xs gap-1 min-h-[40px] px-3 font-medium"
            type="button"
          >
            <ZoomOut className="h-4 w-4" />
            Reset ({zoomPercent}%)
          </Button>
        </div>
      )}

      {/* Zoomable Body Map Container */}
      <div
        ref={containerRef}
        className={cn(
          'relative flex justify-center overflow-hidden rounded-lg',
          isMobile && 'touch-manipulation bg-muted/20 p-2'
        )}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
      >
        {/* Zoom indicator during pinch */}
        {isMobile && isPinching && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-foreground/80 text-background px-3 py-1 rounded-full text-sm font-medium">
            {zoomPercent}%
          </div>
        )}
        
        <div
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            transformOrigin: 'center center',
            transition: zoomLevel === 1 ? 'transform 0.2s ease' : 'none',
          }}
          className={cn(isMobile ? 'w-full max-w-[280px]' : 'max-w-[180px]')}
        >
          {activeView === 'front' && (
            <BodyMapFront selectedAreas={selectedAreas} onToggle={toggleArea} />
          )}
          {activeView === 'back' && (
            <BodyMapBack selectedAreas={selectedAreas} onToggle={toggleArea} />
          )}
          {activeView === 'left' && (
            <BodyMapLeftSide selectedAreas={selectedAreas} onToggle={toggleArea} />
          )}
          {activeView === 'right' && (
            <BodyMapRightSide selectedAreas={selectedAreas} onToggle={toggleArea} />
          )}
        </div>
      </div>

      {/* Mobile hint when zoomed out */}
      {isMobile && zoomLevel === 1 && (
        <p className="text-xs text-muted-foreground text-center">
          {t('vault.quiz.pain.zoomHint', 'Pinch to zoom for precise selection')}
        </p>
      )}

      {/* Selected Areas Summary Chips - shows selections from ALL views */}
      {selectedAreas.length > 0 ? (
        <div
          className={cn(
            'flex gap-1.5 justify-center',
            isMobile
              ? 'overflow-x-auto pb-2 -mx-2 px-2 flex-nowrap'
              : 'flex-wrap max-h-24 overflow-y-auto'
          )}
        >
          {selectedAreas.map((areaId) => (
            <button
              key={areaId}
              type="button"
              onClick={() => toggleArea(areaId)}
              className={cn(
                'rounded-full font-medium bg-destructive/20 text-destructive border border-destructive/50 hover:bg-destructive/30 transition-colors',
                isMobile
                  ? 'px-3 py-1.5 text-sm whitespace-nowrap min-h-[36px]'
                  : 'px-2 py-0.5 text-xs'
              )}
            >
              {t(`vault.quiz.pain.area.${areaId}`, getBodyAreaLabel(areaId))}
              <span className="ml-1">×</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic text-center">
          {t('vault.quiz.pain.noPainSelected', "No pain areas selected (that's great!)")}
        </p>
      )}
    </div>
  );
}
