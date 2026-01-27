import { cn } from '@/lib/utils';

interface BodyMapRightSideProps {
  selectedAreas: string[];
  onToggle: (areaId: string) => void;
}

export function BodyMapRightSide({ selectedAreas, onToggle }: BodyMapRightSideProps) {
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
      className="w-full h-auto"
      role="group"
      aria-label="Right side body view for pain selection"
      style={{ touchAction: 'manipulation' }}
    >
      {/* Head silhouette outline */}
      <ellipse cx="70" cy="28" rx="22" ry="26" className="fill-none stroke-muted-foreground/20 stroke-[1]" />
      
      {/* Right Temple */}
      <g
        onClick={() => onToggle('right_temple')}
        onKeyDown={(e) => handleKeyDown(e, 'right_temple')}
        className={getZoneClasses('right_temple')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_temple')}
      >
        <ellipse cx="88" cy="22" rx="10" ry="12" />
      </g>

      {/* Right Jaw */}
      <g
        onClick={() => onToggle('right_jaw')}
        onKeyDown={(e) => handleKeyDown(e, 'right_jaw')}
        className={getZoneClasses('right_jaw')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_jaw')}
      >
        <path d="M92 38 L84 48 L72 52 L72 42 L82 36 Z" />
      </g>

      {/* Right Neck Side */}
      <g
        onClick={() => onToggle('right_neck_side')}
        onKeyDown={(e) => handleKeyDown(e, 'right_neck_side')}
        className={getZoneClasses('right_neck_side')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_neck_side')}
      >
        <rect x="68" y="52" width="14" height="16" rx="3" />
      </g>

      {/* Right Deltoid */}
      <g
        onClick={() => onToggle('right_deltoid')}
        onKeyDown={(e) => handleKeyDown(e, 'right_deltoid')}
        className={getZoneClasses('right_deltoid')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_deltoid')}
      >
        <ellipse cx="94" cy="78" rx="14" ry="12" />
      </g>

      {/* Body outline (torso) */}
      <path 
        d="M58 68 L58 150 Q58 160 62 168 L78 168 Q82 160 82 150 L82 68" 
        className="fill-none stroke-muted-foreground/20 stroke-[1]" 
      />

      {/* Right Ribs */}
      <g
        onClick={() => onToggle('right_ribs')}
        onKeyDown={(e) => handleKeyDown(e, 'right_ribs')}
        className={getZoneClasses('right_ribs')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_ribs')}
      >
        <rect x="78" y="85" width="14" height="32" rx="4" />
      </g>

      {/* Right Oblique */}
      <g
        onClick={() => onToggle('right_oblique')}
        onKeyDown={(e) => handleKeyDown(e, 'right_oblique')}
        className={getZoneClasses('right_oblique')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_oblique')}
      >
        <rect x="78" y="120" width="12" height="28" rx="4" />
      </g>

      {/* Arm outline */}
      <path 
        d="M106 78 L106 160" 
        className="fill-none stroke-muted-foreground/20 stroke-[1]" 
      />

      {/* Hip outline */}
      <ellipse cx="70" cy="165" rx="18" ry="14" className="fill-none stroke-muted-foreground/20 stroke-[1]" />

      {/* Right IT Band */}
      <g
        onClick={() => onToggle('right_it_band')}
        onKeyDown={(e) => handleKeyDown(e, 'right_it_band')}
        className={getZoneClasses('right_it_band')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_it_band')}
      >
        <rect x="80" y="178" width="10" height="52" rx="4" />
      </g>

      {/* Right Knee Side */}
      <g
        onClick={() => onToggle('right_knee_side')}
        onKeyDown={(e) => handleKeyDown(e, 'right_knee_side')}
        className={getZoneClasses('right_knee_side')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_knee_side')}
      >
        <ellipse cx="82" cy="238" rx="12" ry="10" />
      </g>

      {/* Lower leg outline */}
      <rect x="76" y="250" width="12" height="45" rx="5" className="fill-none stroke-muted-foreground/20 stroke-[1]" />

      {/* Right Foot Arch */}
      <g
        onClick={() => onToggle('right_foot_arch')}
        onKeyDown={(e) => handleKeyDown(e, 'right_foot_arch')}
        className={getZoneClasses('right_foot_arch')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_foot_arch')}
      >
        <path d="M92 300 Q95 315 90 328 L78 328 Q74 315 78 300 Z" />
      </g>

      {/* Body silhouette reference lines */}
      <path 
        d="M70 170 L70 178 M74 230 L74 250" 
        className="fill-none stroke-muted-foreground/10 stroke-[1]" 
      />
    </svg>
  );
}
