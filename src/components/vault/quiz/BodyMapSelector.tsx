import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface BodyMapSelectorProps {
  selectedAreas: string[];
  onChange: (areas: string[]) => void;
}

const BODY_AREAS = [
  { id: 'head_neck', labelKey: 'Head/Neck' },
  { id: 'left_shoulder', labelKey: 'L Shoulder' },
  { id: 'right_shoulder', labelKey: 'R Shoulder' },
  { id: 'upper_back', labelKey: 'Upper Back' },
  { id: 'lower_back', labelKey: 'Lower Back' },
  { id: 'left_elbow', labelKey: 'L Elbow' },
  { id: 'right_elbow', labelKey: 'R Elbow' },
  { id: 'left_wrist_hand', labelKey: 'L Wrist/Hand' },
  { id: 'right_wrist_hand', labelKey: 'R Wrist/Hand' },
  { id: 'left_hip', labelKey: 'L Hip' },
  { id: 'right_hip', labelKey: 'R Hip' },
  { id: 'left_knee', labelKey: 'L Knee' },
  { id: 'right_knee', labelKey: 'R Knee' },
  { id: 'left_ankle', labelKey: 'L Ankle' },
  { id: 'right_ankle', labelKey: 'R Ankle' },
  { id: 'left_foot', labelKey: 'L Foot' },
  { id: 'right_foot', labelKey: 'R Foot' },
];

export function BodyMapSelector({ selectedAreas, onChange }: BodyMapSelectorProps) {
  const { t } = useTranslation();

  const toggleArea = (areaId: string) => {
    if (navigator.vibrate) navigator.vibrate(10);
    if (selectedAreas.includes(areaId)) {
      onChange(selectedAreas.filter(a => a !== areaId));
    } else {
      onChange([...selectedAreas, areaId]);
    }
  };

  const isSelected = (areaId: string) => selectedAreas.includes(areaId);

  const getZoneClasses = (areaId: string) => cn(
    "cursor-pointer transition-all duration-150 outline-none",
    isSelected(areaId)
      ? "fill-red-500/30 stroke-red-500 stroke-[2] animate-pulse-subtle"
      : "fill-muted/50 stroke-muted-foreground/30 stroke-[1] hover:fill-muted-foreground/20 hover:stroke-muted-foreground/50"
  );

  const handleKeyDown = (e: React.KeyboardEvent, areaId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleArea(areaId);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        {t('vault.quiz.pain.locationLabel', 'Localized pain today?')}
      </p>
      
      {/* Body Map SVG */}
      <div className="flex justify-center">
        <svg
          viewBox="0 0 200 340"
          className="w-full max-w-[180px] h-auto"
          role="group"
          aria-label={t('vault.quiz.pain.bodyMapLabel', 'Interactive body map for pain selection')}
        >
          {/* Head & Neck */}
          <g
            onClick={() => toggleArea('head_neck')}
            onKeyDown={(e) => handleKeyDown(e, 'head_neck')}
            className={getZoneClasses('head_neck')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.head_neck', 'Head/Neck') + (isSelected('head_neck') ? ' - selected' : '')}
            aria-pressed={isSelected('head_neck')}
          >
            {/* Head circle */}
            <ellipse cx="100" cy="28" rx="22" ry="26" />
            {/* Neck */}
            <rect x="92" y="52" width="16" height="16" rx="2" />
          </g>

          {/* Left Shoulder (appears on viewer's right - anatomical view) */}
          <g
            onClick={() => toggleArea('left_shoulder')}
            onKeyDown={(e) => handleKeyDown(e, 'left_shoulder')}
            className={getZoneClasses('left_shoulder')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.left_shoulder', 'L Shoulder') + (isSelected('left_shoulder') ? ' - selected' : '')}
            aria-pressed={isSelected('left_shoulder')}
          >
            <ellipse cx="138" cy="78" rx="18" ry="12" />
          </g>

          {/* Right Shoulder (appears on viewer's left) */}
          <g
            onClick={() => toggleArea('right_shoulder')}
            onKeyDown={(e) => handleKeyDown(e, 'right_shoulder')}
            className={getZoneClasses('right_shoulder')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.right_shoulder', 'R Shoulder') + (isSelected('right_shoulder') ? ' - selected' : '')}
            aria-pressed={isSelected('right_shoulder')}
          >
            <ellipse cx="62" cy="78" rx="18" ry="12" />
          </g>

          {/* Upper Back / Chest */}
          <g
            onClick={() => toggleArea('upper_back')}
            onKeyDown={(e) => handleKeyDown(e, 'upper_back')}
            className={getZoneClasses('upper_back')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.upper_back', 'Upper Back') + (isSelected('upper_back') ? ' - selected' : '')}
            aria-pressed={isSelected('upper_back')}
          >
            <rect x="72" y="68" width="56" height="40" rx="4" />
          </g>

          {/* Lower Back / Abdomen */}
          <g
            onClick={() => toggleArea('lower_back')}
            onKeyDown={(e) => handleKeyDown(e, 'lower_back')}
            className={getZoneClasses('lower_back')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.lower_back', 'Lower Back') + (isSelected('lower_back') ? ' - selected' : '')}
            aria-pressed={isSelected('lower_back')}
          >
            <rect x="76" y="110" width="48" height="36" rx="4" />
          </g>

          {/* Left Elbow (appears on viewer's right - anatomical view) */}
          <g
            onClick={() => toggleArea('left_elbow')}
            onKeyDown={(e) => handleKeyDown(e, 'left_elbow')}
            className={getZoneClasses('left_elbow')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.left_elbow', 'L Elbow') + (isSelected('left_elbow') ? ' - selected' : '')}
            aria-pressed={isSelected('left_elbow')}
          >
            <rect x="144" y="88" width="14" height="36" rx="6" />
            <ellipse cx="151" cy="130" rx="10" ry="8" />
          </g>

          {/* Right Elbow (appears on viewer's left) */}
          <g
            onClick={() => toggleArea('right_elbow')}
            onKeyDown={(e) => handleKeyDown(e, 'right_elbow')}
            className={getZoneClasses('right_elbow')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.right_elbow', 'R Elbow') + (isSelected('right_elbow') ? ' - selected' : '')}
            aria-pressed={isSelected('right_elbow')}
          >
            <rect x="42" y="88" width="14" height="36" rx="6" />
            <ellipse cx="49" cy="130" rx="10" ry="8" />
          </g>

          {/* Left Wrist/Hand (appears on viewer's right - anatomical view) */}
          <g
            onClick={() => toggleArea('left_wrist_hand')}
            onKeyDown={(e) => handleKeyDown(e, 'left_wrist_hand')}
            className={getZoneClasses('left_wrist_hand')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.left_wrist_hand', 'L Wrist/Hand') + (isSelected('left_wrist_hand') ? ' - selected' : '')}
            aria-pressed={isSelected('left_wrist_hand')}
          >
            <rect x="150" y="136" width="12" height="32" rx="5" />
            <ellipse cx="156" cy="172" rx="8" ry="6" />
            <ellipse cx="156" cy="186" rx="10" ry="12" />
          </g>

          {/* Right Wrist/Hand (appears on viewer's left) */}
          <g
            onClick={() => toggleArea('right_wrist_hand')}
            onKeyDown={(e) => handleKeyDown(e, 'right_wrist_hand')}
            className={getZoneClasses('right_wrist_hand')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.right_wrist_hand', 'R Wrist/Hand') + (isSelected('right_wrist_hand') ? ' - selected' : '')}
            aria-pressed={isSelected('right_wrist_hand')}
          >
            <rect x="38" y="136" width="12" height="32" rx="5" />
            <ellipse cx="44" cy="172" rx="8" ry="6" />
            <ellipse cx="44" cy="186" rx="10" ry="12" />
          </g>

          {/* Left Hip (appears on viewer's right - anatomical view) */}
          <g
            onClick={() => toggleArea('left_hip')}
            onKeyDown={(e) => handleKeyDown(e, 'left_hip')}
            className={getZoneClasses('left_hip')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.left_hip', 'L Hip') + (isSelected('left_hip') ? ' - selected' : '')}
            aria-pressed={isSelected('left_hip')}
          >
            <path d="M100 146 Q116 151 132 146 L130 168 Q115 173 100 168 Z" />
          </g>

          {/* Right Hip (appears on viewer's left) */}
          <g
            onClick={() => toggleArea('right_hip')}
            onKeyDown={(e) => handleKeyDown(e, 'right_hip')}
            className={getZoneClasses('right_hip')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.right_hip', 'R Hip') + (isSelected('right_hip') ? ' - selected' : '')}
            aria-pressed={isSelected('right_hip')}
          >
            <path d="M68 146 Q84 151 100 146 L100 168 Q85 173 70 168 Z" />
          </g>

          {/* Left Knee (appears on viewer's right - anatomical view) */}
          <g
            onClick={() => toggleArea('left_knee')}
            onKeyDown={(e) => handleKeyDown(e, 'left_knee')}
            className={getZoneClasses('left_knee')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.left_knee', 'L Knee') + (isSelected('left_knee') ? ' - selected' : '')}
            aria-pressed={isSelected('left_knee')}
          >
            <rect x="110" y="170" width="18" height="48" rx="8" />
            <ellipse cx="119" cy="226" rx="12" ry="10" />
          </g>

          {/* Right Knee (appears on viewer's left) */}
          <g
            onClick={() => toggleArea('right_knee')}
            onKeyDown={(e) => handleKeyDown(e, 'right_knee')}
            className={getZoneClasses('right_knee')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.right_knee', 'R Knee') + (isSelected('right_knee') ? ' - selected' : '')}
            aria-pressed={isSelected('right_knee')}
          >
            <rect x="72" y="170" width="18" height="48" rx="8" />
            <ellipse cx="81" cy="226" rx="12" ry="10" />
          </g>

          {/* Left Ankle (appears on viewer's right - anatomical view) */}
          <g
            onClick={() => toggleArea('left_ankle')}
            onKeyDown={(e) => handleKeyDown(e, 'left_ankle')}
            className={getZoneClasses('left_ankle')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.left_ankle', 'L Ankle') + (isSelected('left_ankle') ? ' - selected' : '')}
            aria-pressed={isSelected('left_ankle')}
          >
            <rect x="112" y="238" width="14" height="44" rx="6" />
            <ellipse cx="119" cy="288" rx="10" ry="8" />
          </g>

          {/* Right Ankle (appears on viewer's left) */}
          <g
            onClick={() => toggleArea('right_ankle')}
            onKeyDown={(e) => handleKeyDown(e, 'right_ankle')}
            className={getZoneClasses('right_ankle')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.right_ankle', 'R Ankle') + (isSelected('right_ankle') ? ' - selected' : '')}
            aria-pressed={isSelected('right_ankle')}
          >
            <rect x="74" y="238" width="14" height="44" rx="6" />
            <ellipse cx="81" cy="288" rx="10" ry="8" />
          </g>

          {/* Left Foot (appears on viewer's right - anatomical view) */}
          <g
            onClick={() => toggleArea('left_foot')}
            onKeyDown={(e) => handleKeyDown(e, 'left_foot')}
            className={getZoneClasses('left_foot')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.left_foot', 'L Foot') + (isSelected('left_foot') ? ' - selected' : '')}
            aria-pressed={isSelected('left_foot')}
          >
            <ellipse cx="119" cy="308" rx="14" ry="18" />
          </g>

          {/* Right Foot (appears on viewer's left) */}
          <g
            onClick={() => toggleArea('right_foot')}
            onKeyDown={(e) => handleKeyDown(e, 'right_foot')}
            className={getZoneClasses('right_foot')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.right_foot', 'R Foot') + (isSelected('right_foot') ? ' - selected' : '')}
            aria-pressed={isSelected('right_foot')}
          >
            <ellipse cx="81" cy="308" rx="14" ry="18" />
          </g>
        </svg>
      </div>

      {/* Selected Areas Summary Chips */}
      {selectedAreas.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {selectedAreas.map((areaId) => {
            const area = BODY_AREAS.find(a => a.id === areaId);
            return (
              <button
                key={areaId}
                type="button"
                onClick={() => toggleArea(areaId)}
                className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-colors"
              >
                {t(`vault.quiz.pain.area.${areaId}`, area?.labelKey || areaId)}
                <span className="ml-1">×</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic text-center">
          {t('vault.quiz.pain.noPainSelected', "No pain areas selected (that's great!)")}
        </p>
      )}
    </div>
  );
}
