import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface BodyMapSelectorProps {
  selectedAreas: string[];
  onChange: (areas: string[]) => void;
}

const BODY_AREAS = [
  { id: 'head_neck', labelKey: 'Head/Neck' },
  { id: 'shoulder', labelKey: 'Shoulder' },
  { id: 'upper_back', labelKey: 'Upper Back' },
  { id: 'lower_back', labelKey: 'Lower Back' },
  { id: 'elbow', labelKey: 'Elbow' },
  { id: 'wrist_hand', labelKey: 'Wrist/Hand' },
  { id: 'hip', labelKey: 'Hip' },
  { id: 'knee', labelKey: 'Knee' },
  { id: 'ankle', labelKey: 'Ankle' },
  { id: 'foot', labelKey: 'Foot' },
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

          {/* Shoulders */}
          <g
            onClick={() => toggleArea('shoulder')}
            onKeyDown={(e) => handleKeyDown(e, 'shoulder')}
            className={getZoneClasses('shoulder')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.shoulder', 'Shoulder') + (isSelected('shoulder') ? ' - selected' : '')}
            aria-pressed={isSelected('shoulder')}
          >
            {/* Left shoulder */}
            <ellipse cx="62" cy="78" rx="18" ry="12" />
            {/* Right shoulder */}
            <ellipse cx="138" cy="78" rx="18" ry="12" />
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

          {/* Elbows */}
          <g
            onClick={() => toggleArea('elbow')}
            onKeyDown={(e) => handleKeyDown(e, 'elbow')}
            className={getZoneClasses('elbow')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.elbow', 'Elbow') + (isSelected('elbow') ? ' - selected' : '')}
            aria-pressed={isSelected('elbow')}
          >
            {/* Left upper arm */}
            <rect x="42" y="88" width="14" height="36" rx="6" />
            {/* Right upper arm */}
            <rect x="144" y="88" width="14" height="36" rx="6" />
            {/* Left elbow joint */}
            <ellipse cx="49" cy="130" rx="10" ry="8" />
            {/* Right elbow joint */}
            <ellipse cx="151" cy="130" rx="10" ry="8" />
          </g>

          {/* Wrist/Hand */}
          <g
            onClick={() => toggleArea('wrist_hand')}
            onKeyDown={(e) => handleKeyDown(e, 'wrist_hand')}
            className={getZoneClasses('wrist_hand')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.wrist_hand', 'Wrist/Hand') + (isSelected('wrist_hand') ? ' - selected' : '')}
            aria-pressed={isSelected('wrist_hand')}
          >
            {/* Left forearm */}
            <rect x="38" y="136" width="12" height="32" rx="5" />
            {/* Right forearm */}
            <rect x="150" y="136" width="12" height="32" rx="5" />
            {/* Left wrist */}
            <ellipse cx="44" cy="172" rx="8" ry="6" />
            {/* Right wrist */}
            <ellipse cx="156" cy="172" rx="8" ry="6" />
            {/* Left hand */}
            <ellipse cx="44" cy="186" rx="10" ry="12" />
            {/* Right hand */}
            <ellipse cx="156" cy="186" rx="10" ry="12" />
          </g>

          {/* Hip */}
          <g
            onClick={() => toggleArea('hip')}
            onKeyDown={(e) => handleKeyDown(e, 'hip')}
            className={getZoneClasses('hip')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.hip', 'Hip') + (isSelected('hip') ? ' - selected' : '')}
            aria-pressed={isSelected('hip')}
          >
            <path d="M68 146 Q100 156 132 146 L130 168 Q100 178 70 168 Z" />
          </g>

          {/* Knees */}
          <g
            onClick={() => toggleArea('knee')}
            onKeyDown={(e) => handleKeyDown(e, 'knee')}
            className={getZoneClasses('knee')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.knee', 'Knee') + (isSelected('knee') ? ' - selected' : '')}
            aria-pressed={isSelected('knee')}
          >
            {/* Left thigh */}
            <rect x="72" y="170" width="18" height="48" rx="8" />
            {/* Right thigh */}
            <rect x="110" y="170" width="18" height="48" rx="8" />
            {/* Left knee joint */}
            <ellipse cx="81" cy="226" rx="12" ry="10" />
            {/* Right knee joint */}
            <ellipse cx="119" cy="226" rx="12" ry="10" />
          </g>

          {/* Ankles */}
          <g
            onClick={() => toggleArea('ankle')}
            onKeyDown={(e) => handleKeyDown(e, 'ankle')}
            className={getZoneClasses('ankle')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.ankle', 'Ankle') + (isSelected('ankle') ? ' - selected' : '')}
            aria-pressed={isSelected('ankle')}
          >
            {/* Left shin */}
            <rect x="74" y="238" width="14" height="44" rx="6" />
            {/* Right shin */}
            <rect x="112" y="238" width="14" height="44" rx="6" />
            {/* Left ankle */}
            <ellipse cx="81" cy="288" rx="10" ry="8" />
            {/* Right ankle */}
            <ellipse cx="119" cy="288" rx="10" ry="8" />
          </g>

          {/* Feet */}
          <g
            onClick={() => toggleArea('foot')}
            onKeyDown={(e) => handleKeyDown(e, 'foot')}
            className={getZoneClasses('foot')}
            tabIndex={0}
            role="button"
            aria-label={t('vault.quiz.pain.area.foot', 'Foot') + (isSelected('foot') ? ' - selected' : '')}
            aria-pressed={isSelected('foot')}
          >
            {/* Left foot */}
            <ellipse cx="81" cy="308" rx="14" ry="18" />
            {/* Right foot */}
            <ellipse cx="119" cy="308" rx="14" ry="18" />
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
