// This file provides translation key mappings for workout content
// Used by ProductionLab and ProductionStudio to translate exercise names, descriptions, etc.

import { TFunction } from 'i18next';
import { Exercise } from '@/types/workout';

// Helper to get translated exercise from a key
export const getTranslatedExercise = (
  t: TFunction,
  exerciseKey: string,
  fallbackExercise: Exercise
): Exercise => {
  const translatedName = t(`workoutContent.exercises.${exerciseKey}.name`, { defaultValue: fallbackExercise.name });
  const translatedDescription = t(`workoutContent.exercises.${exerciseKey}.description`, { defaultValue: fallbackExercise.description || '' });
  const translatedNotes = t(`workoutContent.exercises.${exerciseKey}.notes`, { defaultValue: fallbackExercise.notes || '' });
  
  return {
    ...fallbackExercise,
    name: translatedName,
    description: translatedDescription,
    notes: translatedNotes,
  };
};

// Helper to get translated day title
export const getTranslatedDayTitle = (
  t: TFunction,
  dayKey: string,
  params?: Record<string, string | number>
): string => {
  return t(`workoutContent.dayTitles.${dayKey}`, params);
};

// Helper to get translated week title
export const getTranslatedWeekTitle = (
  t: TFunction,
  weekNumber: number
): string => {
  return t('workoutContent.weekTitle', { number: weekNumber });
};

// Helper to get translated active recovery
export const getTranslatedActiveRecovery = (
  t: TFunction,
  type: 'hitting' | 'pitching'
): Exercise => {
  return {
    name: t('workoutContent.activeRecovery.name'),
    type: 'skill',
    description: t(`workoutContent.activeRecovery.${type}Desc`),
  };
};

// Helper to get translated equipment
export const getTranslatedEquipment = (
  t: TFunction,
  equipmentId: string,
  fallback: { name: string; description: string }
): { name: string; description: string } => {
  return {
    name: t(`workoutContent.equipment.${equipmentId}.name`, { defaultValue: fallback.name }),
    description: t(`workoutContent.equipment.${equipmentId}.description`, { defaultValue: fallback.description }),
  };
};

// Exercise key mapping for Iron Bambino (convert exercise name to translation key)
export const getExerciseKey = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

// Bat speed exercise keys
export const BAT_SPEED_EXERCISE_KEYS: Record<string, string> = {
  'Speed swings - 10 reps': 'speed_swings_10',
  'Connection ball drill': 'connection_ball',
  'Bat behind back rotations': 'bat_behind_back',
  'Wrist snap drill': 'wrist_snap',
  'Resistance band speed swings': 'resistance_band_swings',
  'One-handed speed swings': 'one_handed_swings',
  'Quick hands drill': 'quick_hands',
  'Swing speed measurement': 'swing_speed_measure',
  'Bat waggle speed drill': 'bat_waggle',
  'Speed tee work - 15 swings': 'speed_tee_15',
  'Velocity ladder swings': 'velocity_ladder',
  'Bat flip speed drill': 'bat_flip_speed',
  'No-stride speed swings': 'no_stride_swings',
  'Fast hands reaction drill': 'fast_hands_reaction',
  'Exit speed competition': 'exit_speed_comp',
  'Rotational snap drill': 'rotational_snap',
  'Light bat max speed - 20 swings': 'light_bat_20',
  'Heavy-light contrast - 10 sets': 'heavy_light_contrast',
  'Intent tee work - max effort': 'intent_tee_max',
  'Barrel speed focus drill': 'barrel_speed_focus',
  'Overload/underload protocol': 'overload_underload',
};

// Arm care and throwing exercise keys
export const THROWING_EXERCISE_KEYS: Record<string, string> = {
  'J-Band Internal Rotation': 'jband_internal',
  'J-Band External Rotation': 'jband_external',
  'J-Band Scap Retraction': 'jband_scap',
  'J-Band High Pulls': 'jband_high_pulls',
  'Sleeper Stretch': 'sleeper_stretch',
  'Cross-Body Stretch': 'crossbody_stretch',
  'Wrist Flexion/Extension': 'wrist_flex_ext',
  'Forearm Pronation/Supination': 'forearm_pro_sup',
  'Long Toss Warm-Up - 60ft': 'long_toss_60',
  'Long Toss Build - 90ft': 'long_toss_90',
  'Long Toss Extension - 120ft': 'long_toss_120',
  'Long Toss Max - 150-200ft': 'long_toss_max',
  'Pull-Down Phase': 'pulldown_phase',
  'Velo Day - Gun Readings': 'velo_day_gun',
  'Weighted Ball - 7oz Overload': 'weighted_7oz',
  'Weighted Ball - 5oz Standard': 'weighted_5oz',
  'Weighted Ball - 4oz Underload': 'weighted_4oz',
  'Contrast Throws': 'contrast_throws',
  'Crow Hop Throws': 'crow_hop',
  'Max Intent Bullpen': 'max_intent_bp',
  'PlyoCare Pivot Pickoffs': 'plyocare_pivot',
  'PlyoCare Roll-Ins': 'plyocare_rollins',
  'PlyoCare Reverse Throws': 'plyocare_reverse',
  'Rocker Throws': 'rocker_throws',
  'Curveball Grip Work': 'curve_grip',
  'Curveball Spin Drills': 'curve_spin',
  'Curveball Shape Focus': 'curve_shape',
  'Slider Grip Work': 'slider_grip',
  'Slider Wrist Action': 'slider_wrist',
  'Slider Tunnel Drill': 'slider_tunnel',
  'Changeup Grip Work': 'changeup_grip',
  'Changeup Arm Speed Matching': 'changeup_arm_speed',
  'Changeup Feel Drills': 'changeup_feel',
  'Quadrant Work': 'quadrant_work',
  'Glove Side/Arm Side': 'glove_arm_side',
  'Up/Down Ladder': 'up_down_ladder',
  'Pitch Sequencing': 'pitch_sequencing',
  'Tunnel Drills': 'tunnel_drills',
};

// Strength exercise keys (based on exercise name)
export const STRENGTH_EXERCISE_KEYS: Record<string, string> = {
  'Trap Bar Deadlift': 'trap_bar_deadlift',
  'Barbell Back Squat': 'barbell_back_squat',
  'Bench Press': 'bench_press',
  'Barbell Row': 'barbell_row',
  'Landmine Rotational Press': 'landmine_rotational_press',
  'Isometric Wall Sit': 'isometric_wall_sit',
  'Isometric Pallof Hold': 'isometric_pallof_hold',
  'Front Squat': 'front_squat',
  'Incline Dumbbell Press': 'incline_db_press',
  'Weighted Pull-Up': 'weighted_pullup',
  'Romanian Deadlift': 'romanian_deadlift',
  'Cable Woodchop High-to-Low': 'cable_woodchop_high_low',
  'Isometric Push-Up Hold': 'isometric_pushup_hold',
  'Isometric Single-Leg Glute Bridge': 'isometric_single_glute_bridge',
  'Box Squat': 'box_squat',
  'Close-Grip Bench Press': 'close_grip_bench',
  'Single-Arm Dumbbell Row': 'single_arm_db_row',
  'Bulgarian Split Squat': 'bulgarian_split_squat',
  'Pallof Press': 'pallof_press',
  'Isometric Inverted Row Hold': 'isometric_inverted_row',
  'Isometric Side Plank': 'isometric_side_plank',
  'Sumo Deadlift': 'sumo_deadlift',
  'Overhead Press': 'overhead_press',
  'Lat Pulldown': 'lat_pulldown',
  'Walking Lunge': 'walking_lunge',
  'Med Ball Rotational Slam': 'medball_rotational_slam',
  'Isometric Split Squat Hold': 'isometric_split_squat',
  'Isometric Hollow Body Hold': 'isometric_hollow_body',
  'Incline Barbell Press': 'incline_barbell_press',
  'Chest-Supported Row': 'chest_supported_row',
  'Dumbbell Shoulder Press': 'db_shoulder_press',
  'Cable Woodchop Low-to-High': 'cable_woodchop_low_high',
  'Isometric Dead Hang': 'isometric_dead_hang',
  'Dumbbell Bench Press': 'db_bench_press',
  'Pallof Press with Step': 'pallof_press_step',
  'Isometric Anti-Rotation Hold': 'isometric_anti_rotation',
  'Glute Bridge March': 'glute_bridge_march',
  'Step-Up': 'step_up',
  'Plank with Shoulder Tap': 'plank_shoulder_tap',
  'Isometric Hip Flexor Hold': 'isometric_hip_flexor',
  'Isometric Lunge Hold': 'isometric_lunge_hold',
  'Deficit Trap Bar Deadlift': 'deficit_trap_bar',
  'Pause Squat': 'pause_squat',
  'Spoto Press': 'spoto_press',
  'Pendlay Row': 'pendlay_row',
  'Single-Leg Romanian Deadlift': 'single_leg_rdl',
  'Isometric Pause Squat Hold': 'isometric_pause_squat',
  'Isometric Loaded Stretch': 'isometric_loaded_stretch',
  'Front Squat with Pause': 'front_squat_pause',
  'Z-Press': 'z_press',
  'Cable Low-to-High Rotation': 'cable_low_high_rotation',
  'Isometric Dead Bug Hold': 'isometric_dead_bug',
  'Eccentric Trap Bar Deadlift': 'eccentric_trap_bar',
  'Eccentric Squat': 'eccentric_squat',
  'Eccentric Bench Press': 'eccentric_bench',
  'Eccentric Row': 'eccentric_row',
  'Eccentric RDL': 'eccentric_rdl',
  'Eccentric Bulgarian Split Squat': 'eccentric_bulgarian',
  'Eccentric Overhead Press': 'eccentric_overhead',
  'Eccentric Pull-Up': 'eccentric_pullup',
  'Eccentric Single-Arm Row': 'eccentric_single_row',
  'Eccentric Step-Down': 'eccentric_step_down',
  'Eccentric Incline Press': 'eccentric_incline',
  'Eccentric Lat Pulldown': 'eccentric_lat_pulldown',
  'Barbell Hip Thrust': 'barbell_hip_thrust',
  'Half-Kneeling Cable Anti-Rotation': 'half_kneel_anti_rotation',
  'Isometric Glute Bridge Hold': 'isometric_glute_bridge',
  'Push-Up Variations': 'pushup_variations',
  'Face Pulls': 'face_pulls',
  'Hip Thrust': 'hip_thrust',
  'Med Ball Scoop Toss': 'medball_scoop_toss',
  'Back Squat': 'back_squat',
  'Barbell Bench Press': 'barbell_bench_press',
  'Half-Kneeling Cable Chop': 'half_kneel_chop',
  'Half-Kneeling Cable Lift': 'half_kneel_lift',
  'Lateral Lunge': 'lateral_lunge',
  'Face Pulls with External Rotation': 'face_pulls_ext_rot',
  'Single-Arm Landmine Press': 'single_arm_landmine',
  'Eccentric Nordic Curl': 'eccentric_nordic',
  'Eccentric Dip': 'eccentric_dip',
  'Tempo Front Squat': 'tempo_front_squat',
  'Negative Pull-Up': 'negative_pullup',
  'Eccentric Lateral Lunge': 'eccentric_lateral_lunge',
};

// Equipment keys
export const EQUIPMENT_KEYS = {
  hitting: {
    bat: 'bat',
    tee: 'tee',
    balls: 'balls',
    net: 'net',
    barbell: 'barbell',
    dumbbells: 'dumbbells',
    trap_bar: 'trap_bar',
    cable_machine: 'cable_machine',
    pullup_bar: 'pullup_bar',
    bench: 'bench',
    weighted_bat: 'weighted_bat',
    speed_bat: 'speed_bat',
    resistance_bands: 'resistance_bands',
    med_ball: 'med_ball',
    box: 'box',
    landmine: 'landmine',
  },
  pitching: {
    glove: 'glove',
    balls: 'balls_pitching',
    mound: 'mound',
    jbands: 'jbands',
    target: 'target',
    barbell: 'barbell',
    dumbbells: 'dumbbells',
    cable_machine: 'cable_machine',
    pullup_bar: 'pullup_bar',
    bench: 'bench',
    trap_bar: 'trap_bar',
    weighted_balls: 'weighted_balls',
    plyocare: 'plyocare',
    foam_roller: 'foam_roller',
    med_ball: 'med_ball',
    radar_gun: 'radar_gun',
    rice_bucket: 'rice_bucket',
    lacrosse_ball: 'lacrosse_ball',
  },
};
