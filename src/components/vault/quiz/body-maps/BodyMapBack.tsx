import { cn } from '@/lib/utils';

interface BodyMapBackProps {
  selectedAreas: string[];
  onToggle: (areaId: string) => void;
}

export function BodyMapBack({ selectedAreas, onToggle }: BodyMapBackProps) {
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
      viewBox="0 0 200 380"
      className="w-full max-w-[180px] h-auto"
      role="group"
      aria-label="Back body view for pain selection"
    >
      {/* Head (Back) */}
      <g
        onClick={() => onToggle('head_back')}
        onKeyDown={(e) => handleKeyDown(e, 'head_back')}
        className={getZoneClasses('head_back')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('head_back')}
      >
        <ellipse cx="100" cy="25" rx="20" ry="23" />
      </g>

      {/* Neck (Back) */}
      <g
        onClick={() => onToggle('neck_back')}
        onKeyDown={(e) => handleKeyDown(e, 'neck_back')}
        className={getZoneClasses('neck_back')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('neck_back')}
      >
        <rect x="92" y="48" width="16" height="14" rx="2" />
      </g>

      {/* Left Shoulder (Back) - viewer's left (mirrored) */}
      <g
        onClick={() => onToggle('left_shoulder_back')}
        onKeyDown={(e) => handleKeyDown(e, 'left_shoulder_back')}
        className={getZoneClasses('left_shoulder_back')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_shoulder_back')}
      >
        <ellipse cx="60" cy="72" rx="16" ry="10" />
      </g>

      {/* Right Shoulder (Back) - viewer's right (mirrored) */}
      <g
        onClick={() => onToggle('right_shoulder_back')}
        onKeyDown={(e) => handleKeyDown(e, 'right_shoulder_back')}
        className={getZoneClasses('right_shoulder_back')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_shoulder_back')}
      >
        <ellipse cx="140" cy="72" rx="16" ry="10" />
      </g>

      {/* Left Upper Back - viewer's left */}
      <g
        onClick={() => onToggle('left_upper_back')}
        onKeyDown={(e) => handleKeyDown(e, 'left_upper_back')}
        className={getZoneClasses('left_upper_back')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_upper_back')}
      >
        <rect x="72" y="64" width="26" height="28" rx="3" />
      </g>

      {/* Right Upper Back - viewer's right */}
      <g
        onClick={() => onToggle('right_upper_back')}
        onKeyDown={(e) => handleKeyDown(e, 'right_upper_back')}
        className={getZoneClasses('right_upper_back')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_upper_back')}
      >
        <rect x="102" y="64" width="26" height="28" rx="3" />
      </g>

      {/* Left Lat - viewer's left */}
      <g
        onClick={() => onToggle('left_lat')}
        onKeyDown={(e) => handleKeyDown(e, 'left_lat')}
        className={getZoneClasses('left_lat')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_lat')}
      >
        <path d="M72 92 L72 120 L82 115 L82 92 Z" />
      </g>

      {/* Right Lat - viewer's right */}
      <g
        onClick={() => onToggle('right_lat')}
        onKeyDown={(e) => handleKeyDown(e, 'right_lat')}
        className={getZoneClasses('right_lat')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_lat')}
      >
        <path d="M128 92 L128 120 L118 115 L118 92 Z" />
      </g>

      {/* Left Tricep - viewer's left */}
      <g
        onClick={() => onToggle('left_tricep')}
        onKeyDown={(e) => handleKeyDown(e, 'left_tricep')}
        className={getZoneClasses('left_tricep')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_tricep')}
      >
        <rect x="40" y="82" width="12" height="32" rx="5" />
      </g>

      {/* Right Tricep - viewer's right */}
      <g
        onClick={() => onToggle('right_tricep')}
        onKeyDown={(e) => handleKeyDown(e, 'right_tricep')}
        className={getZoneClasses('right_tricep')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_tricep')}
      >
        <rect x="148" y="82" width="12" height="32" rx="5" />
      </g>

      {/* Left Elbow Outer - viewer's left */}
      <g
        onClick={() => onToggle('left_elbow_outer')}
        onKeyDown={(e) => handleKeyDown(e, 'left_elbow_outer')}
        className={getZoneClasses('left_elbow_outer')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_elbow_outer')}
      >
        <ellipse cx="46" cy="120" rx="8" ry="6" />
      </g>

      {/* Right Elbow Outer - viewer's right */}
      <g
        onClick={() => onToggle('right_elbow_outer')}
        onKeyDown={(e) => handleKeyDown(e, 'right_elbow_outer')}
        className={getZoneClasses('right_elbow_outer')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_elbow_outer')}
      >
        <ellipse cx="154" cy="120" rx="8" ry="6" />
      </g>

      {/* Left Forearm (Back) - viewer's left */}
      <g
        onClick={() => onToggle('left_forearm_back')}
        onKeyDown={(e) => handleKeyDown(e, 'left_forearm_back')}
        className={getZoneClasses('left_forearm_back')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_forearm_back')}
      >
        <rect x="40" y="126" width="10" height="30" rx="4" />
      </g>

      {/* Right Forearm (Back) - viewer's right */}
      <g
        onClick={() => onToggle('right_forearm_back')}
        onKeyDown={(e) => handleKeyDown(e, 'right_forearm_back')}
        className={getZoneClasses('right_forearm_back')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_forearm_back')}
      >
        <rect x="150" y="126" width="10" height="30" rx="4" />
      </g>

      {/* Left Wrist (Back) - viewer's left */}
      <g
        onClick={() => onToggle('left_wrist_back')}
        onKeyDown={(e) => handleKeyDown(e, 'left_wrist_back')}
        className={getZoneClasses('left_wrist_back')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_wrist_back')}
      >
        <rect x="41" y="156" width="8" height="10" rx="3" />
      </g>

      {/* Right Wrist (Back) - viewer's right */}
      <g
        onClick={() => onToggle('right_wrist_back')}
        onKeyDown={(e) => handleKeyDown(e, 'right_wrist_back')}
        className={getZoneClasses('right_wrist_back')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_wrist_back')}
      >
        <rect x="151" y="156" width="8" height="10" rx="3" />
      </g>

      {/* Left Hand (Back) - viewer's left */}
      <g
        onClick={() => onToggle('left_hand_back')}
        onKeyDown={(e) => handleKeyDown(e, 'left_hand_back')}
        className={getZoneClasses('left_hand_back')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_hand_back')}
      >
        <ellipse cx="45" cy="176" rx="9" ry="12" />
      </g>

      {/* Right Hand (Back) - viewer's right */}
      <g
        onClick={() => onToggle('right_hand_back')}
        onKeyDown={(e) => handleKeyDown(e, 'right_hand_back')}
        className={getZoneClasses('right_hand_back')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_hand_back')}
      >
        <ellipse cx="155" cy="176" rx="9" ry="12" />
      </g>

      {/* Lower Back Left */}
      <g
        onClick={() => onToggle('lower_back_left')}
        onKeyDown={(e) => handleKeyDown(e, 'lower_back_left')}
        className={getZoneClasses('lower_back_left')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('lower_back_left')}
      >
        <rect x="82" y="118" width="16" height="28" rx="3" />
      </g>

      {/* Lower Back Center */}
      <g
        onClick={() => onToggle('lower_back_center')}
        onKeyDown={(e) => handleKeyDown(e, 'lower_back_center')}
        className={getZoneClasses('lower_back_center')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('lower_back_center')}
      >
        <rect x="92" y="92" width="16" height="54" rx="3" />
      </g>

      {/* Lower Back Right */}
      <g
        onClick={() => onToggle('lower_back_right')}
        onKeyDown={(e) => handleKeyDown(e, 'lower_back_right')}
        className={getZoneClasses('lower_back_right')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('lower_back_right')}
      >
        <rect x="102" y="118" width="16" height="28" rx="3" />
      </g>

      {/* Left Glute - viewer's left */}
      <g
        onClick={() => onToggle('left_glute')}
        onKeyDown={(e) => handleKeyDown(e, 'left_glute')}
        className={getZoneClasses('left_glute')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_glute')}
      >
        <ellipse cx="82" cy="160" rx="16" ry="14" />
      </g>

      {/* Right Glute - viewer's right */}
      <g
        onClick={() => onToggle('right_glute')}
        onKeyDown={(e) => handleKeyDown(e, 'right_glute')}
        className={getZoneClasses('right_glute')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_glute')}
      >
        <ellipse cx="118" cy="160" rx="16" ry="14" />
      </g>

      {/* Left Hamstring Inner - viewer's left */}
      <g
        onClick={() => onToggle('left_hamstring_inner')}
        onKeyDown={(e) => handleKeyDown(e, 'left_hamstring_inner')}
        className={getZoneClasses('left_hamstring_inner')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_hamstring_inner')}
      >
        <rect x="84" y="176" width="12" height="45" rx="4" />
      </g>

      {/* Left Hamstring Outer - viewer's left */}
      <g
        onClick={() => onToggle('left_hamstring_outer')}
        onKeyDown={(e) => handleKeyDown(e, 'left_hamstring_outer')}
        className={getZoneClasses('left_hamstring_outer')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_hamstring_outer')}
      >
        <rect x="70" y="176" width="12" height="45" rx="4" />
      </g>

      {/* Right Hamstring Inner - viewer's right */}
      <g
        onClick={() => onToggle('right_hamstring_inner')}
        onKeyDown={(e) => handleKeyDown(e, 'right_hamstring_inner')}
        className={getZoneClasses('right_hamstring_inner')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_hamstring_inner')}
      >
        <rect x="104" y="176" width="12" height="45" rx="4" />
      </g>

      {/* Right Hamstring Outer - viewer's right */}
      <g
        onClick={() => onToggle('right_hamstring_outer')}
        onKeyDown={(e) => handleKeyDown(e, 'right_hamstring_outer')}
        className={getZoneClasses('right_hamstring_outer')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_hamstring_outer')}
      >
        <rect x="118" y="176" width="12" height="45" rx="4" />
      </g>

      {/* Left Knee (Back) - viewer's left */}
      <g
        onClick={() => onToggle('left_knee_back')}
        onKeyDown={(e) => handleKeyDown(e, 'left_knee_back')}
        className={getZoneClasses('left_knee_back')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_knee_back')}
      >
        <ellipse cx="83" cy="230" rx="12" ry="10" />
      </g>

      {/* Right Knee (Back) - viewer's right */}
      <g
        onClick={() => onToggle('right_knee_back')}
        onKeyDown={(e) => handleKeyDown(e, 'right_knee_back')}
        className={getZoneClasses('right_knee_back')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_knee_back')}
      >
        <ellipse cx="117" cy="230" rx="12" ry="10" />
      </g>

      {/* Left Calf Inner - viewer's left */}
      <g
        onClick={() => onToggle('left_calf_inner')}
        onKeyDown={(e) => handleKeyDown(e, 'left_calf_inner')}
        className={getZoneClasses('left_calf_inner')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_calf_inner')}
      >
        <rect x="83" y="242" width="10" height="38" rx="4" />
      </g>

      {/* Left Calf Outer - viewer's left */}
      <g
        onClick={() => onToggle('left_calf_outer')}
        onKeyDown={(e) => handleKeyDown(e, 'left_calf_outer')}
        className={getZoneClasses('left_calf_outer')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_calf_outer')}
      >
        <rect x="71" y="242" width="10" height="38" rx="4" />
      </g>

      {/* Right Calf Inner - viewer's right */}
      <g
        onClick={() => onToggle('right_calf_inner')}
        onKeyDown={(e) => handleKeyDown(e, 'right_calf_inner')}
        className={getZoneClasses('right_calf_inner')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_calf_inner')}
      >
        <rect x="107" y="242" width="10" height="38" rx="4" />
      </g>

      {/* Right Calf Outer - viewer's right */}
      <g
        onClick={() => onToggle('right_calf_outer')}
        onKeyDown={(e) => handleKeyDown(e, 'right_calf_outer')}
        className={getZoneClasses('right_calf_outer')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_calf_outer')}
      >
        <rect x="119" y="242" width="10" height="38" rx="4" />
      </g>

      {/* Left Achilles - viewer's left */}
      <g
        onClick={() => onToggle('left_achilles')}
        onKeyDown={(e) => handleKeyDown(e, 'left_achilles')}
        className={getZoneClasses('left_achilles')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_achilles')}
      >
        <rect x="80" y="282" width="6" height="16" rx="2" />
      </g>

      {/* Right Achilles - viewer's right */}
      <g
        onClick={() => onToggle('right_achilles')}
        onKeyDown={(e) => handleKeyDown(e, 'right_achilles')}
        className={getZoneClasses('right_achilles')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_achilles')}
      >
        <rect x="114" y="282" width="6" height="16" rx="2" />
      </g>

      {/* Left Heel - viewer's left */}
      <g
        onClick={() => onToggle('left_heel')}
        onKeyDown={(e) => handleKeyDown(e, 'left_heel')}
        className={getZoneClasses('left_heel')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_heel')}
      >
        <ellipse cx="83" cy="310" rx="11" ry="14" />
      </g>

      {/* Right Heel - viewer's right */}
      <g
        onClick={() => onToggle('right_heel')}
        onKeyDown={(e) => handleKeyDown(e, 'right_heel')}
        className={getZoneClasses('right_heel')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_heel')}
      >
        <ellipse cx="117" cy="310" rx="11" ry="14" />
      </g>
    </svg>
  );
}
