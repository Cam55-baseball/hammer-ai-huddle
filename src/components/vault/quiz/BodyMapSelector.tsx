import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
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

export function BodyMapSelector({ selectedAreas, onChange }: BodyMapSelectorProps) {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<BodyView>('front');

  const toggleArea = (areaId: string) => {
    if (navigator.vibrate) navigator.vibrate(10);
    if (selectedAreas.includes(areaId)) {
      onChange(selectedAreas.filter(a => a !== areaId));
    } else {
      onChange([...selectedAreas, areaId]);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        {t('vault.quiz.pain.locationLabel', 'Localized pain today?')}
      </p>
      
      {/* View Selector Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg bg-muted/50 p-1">
          {(['front', 'back', 'left', 'right'] as BodyView[]).map(view => (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
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

      {/* Body Map SVG - switches based on view */}
      <div className="flex justify-center">
        {activeView === 'front' && <BodyMapFront selectedAreas={selectedAreas} onToggle={toggleArea} />}
        {activeView === 'back' && <BodyMapBack selectedAreas={selectedAreas} onToggle={toggleArea} />}
        {activeView === 'left' && <BodyMapLeftSide selectedAreas={selectedAreas} onToggle={toggleArea} />}
        {activeView === 'right' && <BodyMapRightSide selectedAreas={selectedAreas} onToggle={toggleArea} />}
      </div>

      {/* Selected Areas Summary Chips - shows selections from ALL views */}
      {selectedAreas.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 justify-center max-h-24 overflow-y-auto">
          {selectedAreas.map((areaId) => (
            <button
              key={areaId}
              type="button"
              onClick={() => toggleArea(areaId)}
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/20 text-destructive border border-destructive/50 hover:bg-destructive/30 transition-colors"
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
