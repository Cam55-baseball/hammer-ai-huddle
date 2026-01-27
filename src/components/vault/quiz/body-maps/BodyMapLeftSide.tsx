import { cn } from '@/lib/utils';

interface BodyMapLeftSideProps {
  selectedAreas: string[];
  onToggle: (areaId: string) => void;
}

export function BodyMapLeftSide({ selectedAreas, onToggle }: BodyMapLeftSideProps) {
  const isSelected = (id: string) => selectedAreas.includes(id);

  const getZoneClasses = (areaId: string) =>
    cn(
      'cursor-pointer transition-all duration-150 outline-none',
      isSelected(areaId)
        ? 'fill-red-500/30 stroke-red-500 stroke-[2] animate-pulse-subtle'
        : 'fill-muted/50 stroke-muted-foreground/30 stroke-[1] hover:fill-muted-foreground/20 hover:stroke-muted-foreground/50'
    );

  const handleKeyDown = (e: React.KeyboardEvent, areaId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(areaId);
    }
  };

  return (
    <svg
      viewBox="0 0 140 380"
      className="w-full max-w-[120px] h-auto"
      role="group"
      aria-label="Left side body view for pain selection"
    >
      {/* Head silhouette outline */}
      <ellipse cx="70" cy="28" rx="22" ry="26" className="fill-none stroke-muted-foreground/20 stroke-[1]" />
      
      {/* Left Temple */}
      <g
        onClick={() => onToggle('left_temple')}
        onKeyDown={(e) => handleKeyDown(e, 'left_temple')}
        className={getZoneClasses('left_temple')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_temple')}
      >
        <ellipse cx="52" cy="22" rx="10" ry="12" />
      </g>

      {/* Left Jaw */}
      <g
        onClick={() => onToggle('left_jaw')}
        onKeyDown={(e) => handleKeyDown(e, 'left_jaw')}
        className={getZoneClasses('left_jaw')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_jaw')}
      >
        <path d="M48 38 L56 48 L68 52 L68 42 L58 36 Z" />
      </g>

      {/* Left Neck Side */}
      <g
        onClick={() => onToggle('left_neck_side')}
        onKeyDown={(e) => handleKeyDown(e, 'left_neck_side')}
        className={getZoneClasses('left_neck_side')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_neck_side')}
      >
        <rect x="58" y="52" width="14" height="16" rx="3" />
      </g>

      {/* Left Deltoid */}
      <g
        onClick={() => onToggle('left_deltoid')}
        onKeyDown={(e) => handleKeyDown(e, 'left_deltoid')}
        className={getZoneClasses('left_deltoid')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_deltoid')}
      >
        <ellipse cx="46" cy="78" rx="14" ry="12" />
      </g>

      {/* Body outline (torso) */}
      <path 
        d="M58 68 L58 150 Q58 160 62 168 L78 168 Q82 160 82 150 L82 68" 
        className="fill-none stroke-muted-foreground/20 stroke-[1]" 
      />

      {/* Left Ribs */}
      <g
        onClick={() => onToggle('left_ribs')}
        onKeyDown={(e) => handleKeyDown(e, 'left_ribs')}
        className={getZoneClasses('left_ribs')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_ribs')}
      >
        <rect x="48" y="85" width="14" height="32" rx="4" />
      </g>

      {/* Left Oblique */}
      <g
        onClick={() => onToggle('left_oblique')}
        onKeyDown={(e) => handleKeyDown(e, 'left_oblique')}
        className={getZoneClasses('left_oblique')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_oblique')}
      >
        <rect x="50" y="120" width="12" height="28" rx="4" />
      </g>

      {/* Arm outline */}
      <path 
        d="M34 78 L34 160" 
        className="fill-none stroke-muted-foreground/20 stroke-[1]" 
      />

      {/* Hip outline */}
      <ellipse cx="70" cy="165" rx="18" ry="14" className="fill-none stroke-muted-foreground/20 stroke-[1]" />

      {/* Left IT Band */}
      <g
        onClick={() => onToggle('left_it_band')}
        onKeyDown={(e) => handleKeyDown(e, 'left_it_band')}
        className={getZoneClasses('left_it_band')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_it_band')}
      >
        <rect x="50" y="178" width="10" height="52" rx="4" />
      </g>

      {/* Left Knee Side */}
      <g
        onClick={() => onToggle('left_knee_side')}
        onKeyDown={(e) => handleKeyDown(e, 'left_knee_side')}
        className={getZoneClasses('left_knee_side')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_knee_side')}
      >
        <ellipse cx="58" cy="238" rx="12" ry="10" />
      </g>

      {/* Lower leg outline */}
      <rect x="52" y="250" width="12" height="45" rx="5" className="fill-none stroke-muted-foreground/20 stroke-[1]" />

      {/* Left Foot Arch */}
      <g
        onClick={() => onToggle('left_foot_arch')}
        onKeyDown={(e) => handleKeyDown(e, 'left_foot_arch')}
        className={getZoneClasses('left_foot_arch')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_foot_arch')}
      >
        <path d="M48 300 Q45 315 50 328 L62 328 Q66 315 62 300 Z" />
      </g>

      {/* Body silhouette reference lines */}
      <path 
        d="M70 170 L70 178 M66 230 L66 250" 
        className="fill-none stroke-muted-foreground/10 stroke-[1]" 
      />
    </svg>
  );
}
