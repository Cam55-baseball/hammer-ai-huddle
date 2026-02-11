// Centralized body area definitions for multi-view body map
// Used by BodyMapSelector, VaultPainHeatMapCard, and VaultPainPatternAlert

export type BodyView = 'front' | 'back' | 'left' | 'right';

export interface BodyArea {
  id: string;
  label: string;
}

// Front view body areas
export const FRONT_BODY_AREAS: BodyArea[] = [
  { id: 'head_front', label: 'Head (Front)' },
  { id: 'neck_front', label: 'Neck (Front)' },
  { id: 'left_shoulder_front', label: 'L Shoulder (Front)' },
  { id: 'right_shoulder_front', label: 'R Shoulder (Front)' },
  { id: 'left_chest', label: 'L Chest' },
  { id: 'right_chest', label: 'R Chest' },
  { id: 'sternum', label: 'Sternum' },
  { id: 'left_bicep', label: 'L Bicep' },
  { id: 'right_bicep', label: 'R Bicep' },
  { id: 'left_elbow_inner', label: 'L Elbow (Inner)' },
  { id: 'right_elbow_inner', label: 'R Elbow (Inner)' },
  { id: 'left_forearm_front', label: 'L Forearm (Front)' },
  { id: 'right_forearm_front', label: 'R Forearm (Front)' },
  { id: 'left_wrist_front', label: 'L Wrist (Front)' },
  { id: 'right_wrist_front', label: 'R Wrist (Front)' },
  { id: 'left_palm', label: 'L Palm' },
  { id: 'right_palm', label: 'R Palm' },
  { id: 'upper_abs', label: 'Upper Abs' },
  { id: 'lower_abs', label: 'Lower Abs' },
  { id: 'left_hip_flexor', label: 'L Hip Flexor' },
  { id: 'right_hip_flexor', label: 'R Hip Flexor' },
  { id: 'left_groin', label: 'L Groin' },
  { id: 'right_groin', label: 'R Groin' },
  { id: 'left_quad_inner', label: 'L Quad (Inner)' },
  { id: 'left_quad_outer', label: 'L Quad (Outer)' },
  { id: 'right_quad_inner', label: 'R Quad (Inner)' },
  { id: 'right_quad_outer', label: 'R Quad (Outer)' },
  { id: 'left_knee_front', label: 'L Knee (Front)' },
  { id: 'right_knee_front', label: 'R Knee (Front)' },
  { id: 'left_shin', label: 'L Shin' },
  { id: 'right_shin', label: 'R Shin' },
  { id: 'left_ankle_inside', label: 'L Ankle (Inside)' },
  { id: 'left_ankle_outside', label: 'L Ankle (Outside)' },
  { id: 'right_ankle_inside', label: 'R Ankle (Inside)' },
  { id: 'right_ankle_outside', label: 'R Ankle (Outside)' },
  { id: 'left_foot_top', label: 'L Foot (Top)' },
  { id: 'right_foot_top', label: 'R Foot (Top)' },
];

// Back view body areas
export const BACK_BODY_AREAS: BodyArea[] = [
  { id: 'head_back', label: 'Head (Back)' },
  { id: 'neck_back', label: 'Neck (Back)' },
  { id: 'left_shoulder_back', label: 'L Shoulder (Back)' },
  { id: 'right_shoulder_back', label: 'R Shoulder (Back)' },
  { id: 'left_upper_back', label: 'L Upper Back' },
  { id: 'right_upper_back', label: 'R Upper Back' },
  { id: 'left_lat', label: 'L Lat' },
  { id: 'right_lat', label: 'R Lat' },
  { id: 'left_tricep', label: 'L Tricep' },
  { id: 'right_tricep', label: 'R Tricep' },
  { id: 'left_elbow_outer', label: 'L Elbow (Outer)' },
  { id: 'right_elbow_outer', label: 'R Elbow (Outer)' },
  { id: 'left_forearm_back', label: 'L Forearm (Back)' },
  { id: 'right_forearm_back', label: 'R Forearm (Back)' },
  { id: 'left_wrist_back', label: 'L Wrist (Back)' },
  { id: 'right_wrist_back', label: 'R Wrist (Back)' },
  { id: 'left_hand_back', label: 'L Hand (Back)' },
  { id: 'right_hand_back', label: 'R Hand (Back)' },
  { id: 'lower_back_left', label: 'Lower Back (L)' },
  { id: 'lower_back_center', label: 'Lower Back (Center)' },
  { id: 'lower_back_right', label: 'Lower Back (R)' },
  { id: 'left_glute', label: 'L Glute' },
  { id: 'right_glute', label: 'R Glute' },
  { id: 'left_hamstring_inner', label: 'L Hamstring (Inner)' },
  { id: 'left_hamstring_outer', label: 'L Hamstring (Outer)' },
  { id: 'right_hamstring_inner', label: 'R Hamstring (Inner)' },
  { id: 'right_hamstring_outer', label: 'R Hamstring (Outer)' },
  { id: 'left_knee_back', label: 'L Knee (Back)' },
  { id: 'right_knee_back', label: 'R Knee (Back)' },
  { id: 'left_calf_inner', label: 'L Calf (Inner)' },
  { id: 'left_calf_outer', label: 'L Calf (Outer)' },
  { id: 'right_calf_inner', label: 'R Calf (Inner)' },
  { id: 'right_calf_outer', label: 'R Calf (Outer)' },
  { id: 'left_achilles', label: 'L Achilles' },
  { id: 'right_achilles', label: 'R Achilles' },
  { id: 'left_heel', label: 'L Heel' },
  { id: 'right_heel', label: 'R Heel' },
];

// Left side view body areas
export const LEFT_SIDE_BODY_AREAS: BodyArea[] = [
  { id: 'left_temple', label: 'L Temple' },
  { id: 'left_jaw', label: 'L Jaw' },
  { id: 'left_neck_side', label: 'L Neck (Side)' },
  { id: 'left_deltoid', label: 'L Deltoid' },
  { id: 'left_ribs', label: 'L Ribs' },
  { id: 'left_oblique', label: 'L Oblique' },
  { id: 'left_it_band', label: 'L IT Band' },
  { id: 'left_knee_side', label: 'L Knee (Side)' },
  { id: 'left_tibia', label: 'L Tibia' },
  { id: 'left_fibula', label: 'L Fibula' },
  { id: 'left_foot_arch', label: 'L Foot Arch' },
];

// Right side view body areas
export const RIGHT_SIDE_BODY_AREAS: BodyArea[] = [
  { id: 'right_temple', label: 'R Temple' },
  { id: 'right_jaw', label: 'R Jaw' },
  { id: 'right_neck_side', label: 'R Neck (Side)' },
  { id: 'right_deltoid', label: 'R Deltoid' },
  { id: 'right_ribs', label: 'R Ribs' },
  { id: 'right_oblique', label: 'R Oblique' },
  { id: 'right_it_band', label: 'R IT Band' },
  { id: 'right_knee_side', label: 'R Knee (Side)' },
  { id: 'right_tibia', label: 'R Tibia' },
  { id: 'right_fibula', label: 'R Fibula' },
  { id: 'right_foot_arch', label: 'R Foot Arch' },
];

// Combined areas by view
export const BODY_AREAS_BY_VIEW: Record<BodyView, BodyArea[]> = {
  front: FRONT_BODY_AREAS,
  back: BACK_BODY_AREAS,
  left: LEFT_SIDE_BODY_AREAS,
  right: RIGHT_SIDE_BODY_AREAS,
};

// All body areas combined
export const ALL_BODY_AREAS: BodyArea[] = [
  ...FRONT_BODY_AREAS,
  ...BACK_BODY_AREAS,
  ...LEFT_SIDE_BODY_AREAS,
  ...RIGHT_SIDE_BODY_AREAS,
];

// ID to label mapping for quick lookup
export const BODY_AREA_LABELS: Record<string, string> = Object.fromEntries(
  ALL_BODY_AREAS.map((a) => [a.id, a.label])
);

// Legacy ID mapping for backward compatibility
export const LEGACY_BODY_AREA_LABELS: Record<string, string> = {
  head_neck: 'Head/Neck',
  left_shoulder: 'L Shoulder',
  right_shoulder: 'R Shoulder',
  shoulder: 'Shoulder',
  upper_back: 'Upper Back',
  lower_back: 'Lower Back',
  left_elbow: 'L Elbow',
  right_elbow: 'R Elbow',
  elbow: 'Elbow',
  left_wrist_hand: 'L Wrist/Hand',
  right_wrist_hand: 'R Wrist/Hand',
  wrist_hand: 'Wrist/Hand',
  left_hip: 'L Hip',
  right_hip: 'R Hip',
  hip: 'Hip',
  left_knee: 'L Knee',
  right_knee: 'R Knee',
  knee: 'Knee',
  left_ankle: 'L Ankle',
  right_ankle: 'R Ankle',
  ankle: 'Ankle',
  left_foot: 'L Foot',
  right_foot: 'R Foot',
  foot: 'Foot',
};

// Get label for any area ID (new or legacy)
export function getBodyAreaLabel(areaId: string): string {
  return BODY_AREA_LABELS[areaId] || LEGACY_BODY_AREA_LABELS[areaId] || areaId;
}

// Get all body areas including legacy for heat map
export const ALL_BODY_AREAS_WITH_LEGACY: BodyArea[] = [
  ...ALL_BODY_AREAS,
  ...Object.entries(LEGACY_BODY_AREA_LABELS).map(([id, label]) => ({ id, label })),
];
