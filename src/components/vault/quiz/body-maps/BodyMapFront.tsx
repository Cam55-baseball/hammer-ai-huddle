import { cn } from '@/lib/utils';

interface BodyMapFrontProps {
  selectedAreas: string[];
  onToggle: (areaId: string) => void;
}

export function BodyMapFront({ selectedAreas, onToggle }: BodyMapFrontProps) {
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
      aria-label="Front body view for pain selection"
    >
      {/* Head (Front) */}
      <g
        onClick={() => onToggle('head_front')}
        onKeyDown={(e) => handleKeyDown(e, 'head_front')}
        className={getZoneClasses('head_front')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('head_front')}
      >
        <ellipse cx="100" cy="25" rx="20" ry="23" />
      </g>

      {/* Neck (Front) */}
      <g
        onClick={() => onToggle('neck_front')}
        onKeyDown={(e) => handleKeyDown(e, 'neck_front')}
        className={getZoneClasses('neck_front')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('neck_front')}
      >
        <rect x="92" y="48" width="16" height="14" rx="2" />
      </g>

      {/* Left Shoulder (Front) - viewer's right */}
      <g
        onClick={() => onToggle('left_shoulder_front')}
        onKeyDown={(e) => handleKeyDown(e, 'left_shoulder_front')}
        className={getZoneClasses('left_shoulder_front')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_shoulder_front')}
      >
        <ellipse cx="140" cy="72" rx="16" ry="10" />
      </g>

      {/* Right Shoulder (Front) - viewer's left */}
      <g
        onClick={() => onToggle('right_shoulder_front')}
        onKeyDown={(e) => handleKeyDown(e, 'right_shoulder_front')}
        className={getZoneClasses('right_shoulder_front')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_shoulder_front')}
      >
        <ellipse cx="60" cy="72" rx="16" ry="10" />
      </g>

      {/* Left Chest - viewer's right */}
      <g
        onClick={() => onToggle('left_chest')}
        onKeyDown={(e) => handleKeyDown(e, 'left_chest')}
        className={getZoneClasses('left_chest')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_chest')}
      >
        <path d="M102 64 L124 62 L128 88 L102 92 Z" />
      </g>

      {/* Right Chest - viewer's left */}
      <g
        onClick={() => onToggle('right_chest')}
        onKeyDown={(e) => handleKeyDown(e, 'right_chest')}
        className={getZoneClasses('right_chest')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_chest')}
      >
        <path d="M98 64 L76 62 L72 88 L98 92 Z" />
      </g>

      {/* Sternum */}
      <g
        onClick={() => onToggle('sternum')}
        onKeyDown={(e) => handleKeyDown(e, 'sternum')}
        className={getZoneClasses('sternum')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('sternum')}
      >
        <rect x="96" y="64" width="8" height="28" rx="2" />
      </g>

      {/* Left Bicep - viewer's right */}
      <g
        onClick={() => onToggle('left_bicep')}
        onKeyDown={(e) => handleKeyDown(e, 'left_bicep')}
        className={getZoneClasses('left_bicep')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_bicep')}
      >
        <rect x="148" y="82" width="12" height="32" rx="5" />
      </g>

      {/* Right Bicep - viewer's left */}
      <g
        onClick={() => onToggle('right_bicep')}
        onKeyDown={(e) => handleKeyDown(e, 'right_bicep')}
        className={getZoneClasses('right_bicep')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_bicep')}
      >
        <rect x="40" y="82" width="12" height="32" rx="5" />
      </g>

      {/* Left Elbow Inner - viewer's right */}
      <g
        onClick={() => onToggle('left_elbow_inner')}
        onKeyDown={(e) => handleKeyDown(e, 'left_elbow_inner')}
        className={getZoneClasses('left_elbow_inner')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_elbow_inner')}
      >
        <ellipse cx="154" cy="120" rx="8" ry="6" />
      </g>

      {/* Right Elbow Inner - viewer's left */}
      <g
        onClick={() => onToggle('right_elbow_inner')}
        onKeyDown={(e) => handleKeyDown(e, 'right_elbow_inner')}
        className={getZoneClasses('right_elbow_inner')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_elbow_inner')}
      >
        <ellipse cx="46" cy="120" rx="8" ry="6" />
      </g>

      {/* Left Forearm (Front) - viewer's right */}
      <g
        onClick={() => onToggle('left_forearm_front')}
        onKeyDown={(e) => handleKeyDown(e, 'left_forearm_front')}
        className={getZoneClasses('left_forearm_front')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_forearm_front')}
      >
        <rect x="150" y="126" width="10" height="30" rx="4" />
      </g>

      {/* Right Forearm (Front) - viewer's left */}
      <g
        onClick={() => onToggle('right_forearm_front')}
        onKeyDown={(e) => handleKeyDown(e, 'right_forearm_front')}
        className={getZoneClasses('right_forearm_front')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_forearm_front')}
      >
        <rect x="40" y="126" width="10" height="30" rx="4" />
      </g>

      {/* Left Wrist (Front) - viewer's right */}
      <g
        onClick={() => onToggle('left_wrist_front')}
        onKeyDown={(e) => handleKeyDown(e, 'left_wrist_front')}
        className={getZoneClasses('left_wrist_front')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_wrist_front')}
      >
        <rect x="151" y="156" width="8" height="10" rx="3" />
      </g>

      {/* Right Wrist (Front) - viewer's left */}
      <g
        onClick={() => onToggle('right_wrist_front')}
        onKeyDown={(e) => handleKeyDown(e, 'right_wrist_front')}
        className={getZoneClasses('right_wrist_front')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_wrist_front')}
      >
        <rect x="41" y="156" width="8" height="10" rx="3" />
      </g>

      {/* Left Palm - viewer's right */}
      <g
        onClick={() => onToggle('left_palm')}
        onKeyDown={(e) => handleKeyDown(e, 'left_palm')}
        className={getZoneClasses('left_palm')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_palm')}
      >
        <ellipse cx="155" cy="176" rx="9" ry="12" />
      </g>

      {/* Right Palm - viewer's left */}
      <g
        onClick={() => onToggle('right_palm')}
        onKeyDown={(e) => handleKeyDown(e, 'right_palm')}
        className={getZoneClasses('right_palm')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_palm')}
      >
        <ellipse cx="45" cy="176" rx="9" ry="12" />
      </g>

      {/* Upper Abs */}
      <g
        onClick={() => onToggle('upper_abs')}
        onKeyDown={(e) => handleKeyDown(e, 'upper_abs')}
        className={getZoneClasses('upper_abs')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('upper_abs')}
      >
        <rect x="80" y="92" width="40" height="24" rx="3" />
      </g>

      {/* Lower Abs */}
      <g
        onClick={() => onToggle('lower_abs')}
        onKeyDown={(e) => handleKeyDown(e, 'lower_abs')}
        className={getZoneClasses('lower_abs')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('lower_abs')}
      >
        <rect x="82" y="118" width="36" height="24" rx="3" />
      </g>

      {/* Left Hip Flexor - viewer's right */}
      <g
        onClick={() => onToggle('left_hip_flexor')}
        onKeyDown={(e) => handleKeyDown(e, 'left_hip_flexor')}
        className={getZoneClasses('left_hip_flexor')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_hip_flexor')}
      >
        <path d="M102 142 L118 142 L120 158 L104 158 Z" />
      </g>

      {/* Right Hip Flexor - viewer's left */}
      <g
        onClick={() => onToggle('right_hip_flexor')}
        onKeyDown={(e) => handleKeyDown(e, 'right_hip_flexor')}
        className={getZoneClasses('right_hip_flexor')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_hip_flexor')}
      >
        <path d="M98 142 L82 142 L80 158 L96 158 Z" />
      </g>

      {/* Left Groin - viewer's right */}
      <g
        onClick={() => onToggle('left_groin')}
        onKeyDown={(e) => handleKeyDown(e, 'left_groin')}
        className={getZoneClasses('left_groin')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_groin')}
      >
        <path d="M100 158 L112 158 L110 172 L100 172 Z" />
      </g>

      {/* Right Groin - viewer's left */}
      <g
        onClick={() => onToggle('right_groin')}
        onKeyDown={(e) => handleKeyDown(e, 'right_groin')}
        className={getZoneClasses('right_groin')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_groin')}
      >
        <path d="M100 158 L88 158 L90 172 L100 172 Z" />
      </g>

      {/* Left Quad Inner - viewer's right */}
      <g
        onClick={() => onToggle('left_quad_inner')}
        onKeyDown={(e) => handleKeyDown(e, 'left_quad_inner')}
        className={getZoneClasses('left_quad_inner')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_quad_inner')}
      >
        <rect x="104" y="172" width="12" height="48" rx="4" />
      </g>

      {/* Left Quad Outer - viewer's right */}
      <g
        onClick={() => onToggle('left_quad_outer')}
        onKeyDown={(e) => handleKeyDown(e, 'left_quad_outer')}
        className={getZoneClasses('left_quad_outer')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_quad_outer')}
      >
        <rect x="118" y="172" width="12" height="48" rx="4" />
      </g>

      {/* Right Quad Inner - viewer's left */}
      <g
        onClick={() => onToggle('right_quad_inner')}
        onKeyDown={(e) => handleKeyDown(e, 'right_quad_inner')}
        className={getZoneClasses('right_quad_inner')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_quad_inner')}
      >
        <rect x="84" y="172" width="12" height="48" rx="4" />
      </g>

      {/* Right Quad Outer - viewer's left */}
      <g
        onClick={() => onToggle('right_quad_outer')}
        onKeyDown={(e) => handleKeyDown(e, 'right_quad_outer')}
        className={getZoneClasses('right_quad_outer')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_quad_outer')}
      >
        <rect x="70" y="172" width="12" height="48" rx="4" />
      </g>

      {/* Left Knee (Front) - viewer's right */}
      <g
        onClick={() => onToggle('left_knee_front')}
        onKeyDown={(e) => handleKeyDown(e, 'left_knee_front')}
        className={getZoneClasses('left_knee_front')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_knee_front')}
      >
        <ellipse cx="117" cy="230" rx="12" ry="10" />
      </g>

      {/* Right Knee (Front) - viewer's left */}
      <g
        onClick={() => onToggle('right_knee_front')}
        onKeyDown={(e) => handleKeyDown(e, 'right_knee_front')}
        className={getZoneClasses('right_knee_front')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_knee_front')}
      >
        <ellipse cx="83" cy="230" rx="12" ry="10" />
      </g>

      {/* Left Shin - viewer's right */}
      <g
        onClick={() => onToggle('left_shin')}
        onKeyDown={(e) => handleKeyDown(e, 'left_shin')}
        className={getZoneClasses('left_shin')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_shin')}
      >
        <rect x="111" y="242" width="12" height="42" rx="5" />
      </g>

      {/* Right Shin - viewer's left */}
      <g
        onClick={() => onToggle('right_shin')}
        onKeyDown={(e) => handleKeyDown(e, 'right_shin')}
        className={getZoneClasses('right_shin')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_shin')}
      >
        <rect x="77" y="242" width="12" height="42" rx="5" />
      </g>

      {/* Left Ankle Inside - viewer's right */}
      <g
        onClick={() => onToggle('left_ankle_inside')}
        onKeyDown={(e) => handleKeyDown(e, 'left_ankle_inside')}
        className={getZoneClasses('left_ankle_inside')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_ankle_inside')}
      >
        <ellipse cx="110" cy="292" rx="6" ry="7" />
      </g>

      {/* Left Ankle Outside - viewer's right */}
      <g
        onClick={() => onToggle('left_ankle_outside')}
        onKeyDown={(e) => handleKeyDown(e, 'left_ankle_outside')}
        className={getZoneClasses('left_ankle_outside')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_ankle_outside')}
      >
        <ellipse cx="124" cy="292" rx="6" ry="7" />
      </g>

      {/* Right Ankle Inside - viewer's left */}
      <g
        onClick={() => onToggle('right_ankle_inside')}
        onKeyDown={(e) => handleKeyDown(e, 'right_ankle_inside')}
        className={getZoneClasses('right_ankle_inside')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_ankle_inside')}
      >
        <ellipse cx="90" cy="292" rx="6" ry="7" />
      </g>

      {/* Right Ankle Outside - viewer's left */}
      <g
        onClick={() => onToggle('right_ankle_outside')}
        onKeyDown={(e) => handleKeyDown(e, 'right_ankle_outside')}
        className={getZoneClasses('right_ankle_outside')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_ankle_outside')}
      >
        <ellipse cx="76" cy="292" rx="6" ry="7" />
      </g>

      {/* Left Foot (Top) - viewer's right */}
      <g
        onClick={() => onToggle('left_foot_top')}
        onKeyDown={(e) => handleKeyDown(e, 'left_foot_top')}
        className={getZoneClasses('left_foot_top')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('left_foot_top')}
      >
        <ellipse cx="117" cy="318" rx="13" ry="18" />
      </g>

      {/* Right Foot (Top) - viewer's left */}
      <g
        onClick={() => onToggle('right_foot_top')}
        onKeyDown={(e) => handleKeyDown(e, 'right_foot_top')}
        className={getZoneClasses('right_foot_top')}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected('right_foot_top')}
      >
        <ellipse cx="83" cy="318" rx="13" ry="18" />
      </g>
    </svg>
  );
}
