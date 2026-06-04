import { useState, useCallback } from 'react';
import type { MovementKey } from '@/lib/pitchMovementProfile';
import type { PieV2RepInput } from '@/lib/pieV2/types';

/**
 * PIE V2 capture surface — additive bag carried alongside MicroLayerData.
 * Pure data; lineage / replay handled at emit time via `emitPieV2RepScore`.
 */
export type PieV2CaptureBag = Partial<
  Pick<
    PieV2RepInput,
    | 'energy_angle_deg'
    | 'eyes_on_target'
    | 'shoulders_closed_to_footstrike'
    | 'leg_lift_to_footstrike_sec'
    | 'stride_pct_body_height'
    | 'head_vertical_drop_pct'
    | 'hips_fired_toward_target'
    | 'glove_inside_frame'
    | 'head_offset_from_belly_line_deg'
    | 'shoulder_horizontal_offset_deg'
    | 'rear_foot_drag_foot_lengths'
    | 'rear_foot_drag_direction_clean'
    | 'release_extension_ft'
    | 'arm_slot_deg'
    | 'video_id'
    | 'video_frame_range'
    | 'athlete_reported_pain'
    | 'provenance'
  >
>;

export interface MicroLayerData {
  pitch_location?: { row: number; col: number };
  swing_decision?: 'correct' | 'incorrect';
  contact_quality?: 'barrel' | 'solid' | 'flare_burner' | 'misshit_clip' | 'weak' | 'whiff';
  exit_direction?: 'pull' | 'middle' | 'oppo' | 'slap_side';
  situation_tag?: { runners: string; outs: number };
  count?: { balls: number; strikes: number };
  pitcher_hand?: 'L' | 'R';
  batter_side?: 'L' | 'R';
  velocity_band?: string;
  spin_rate?: number;
  pitcher_style_tag?: 'riseball' | 'dropball' | 'speed' | 'spin';
  in_zone?: boolean;
  batted_ball_type?: 'ground' | 'line' | 'fly' | 'barrel' | 'slow_roller' | 'one_hopper' | 'chopper';
  spin_direction?: 'topspin' | 'backspin' | 'sidespin';
  pitch_movement?: { directions: ('up' | 'down' | 'left' | 'right')[]; key: MovementKey };
  pitch_movement_profile?: string;
  swing_intent?: 'mechanical' | 'game_intent' | 'situational' | 'hr_derby';
  execution_score?: number;
  // Fielding micro
  play_type?: 'ground_ball' | 'fly_ball' | 'line_drive' | 'bunt' | 'pop_up';
  fielding_result?: 'clean' | 'error' | 'assist';
  throw_accuracy_grade?: number;
  footwork_grade?: number;
  exchange_time_band?: 'fast' | 'average' | 'slow';
  throw_spin_quality?: 'carry' | 'tail' | 'cut' | 'neutral';
  // Pitching micro
  spin_efficiency_pct?: number;
  pitch_command_grade?: number;
  miss_direction?: 'arm_side' | 'glove_side' | 'up' | 'down';
  // Catching micro
  pop_time_band?: 'fast' | 'average' | 'slow';
  transfer_grade?: number;
  block_success?: boolean;
  // Baserunning micro
  jump_grade?: number;
  read_grade?: number;
  time_to_base_band?: 'fast' | 'average' | 'slow';
  // Rep context
  rep_source?: string;
  thrower_hand?: 'L' | 'R';
  throwing_hand?: 'L' | 'R';
  goal_of_rep?: string;
  actual_outcome?: string;
  bp_distance_ft?: number;
  machine_velocity_band?: string;
  // PIE V2 capture bag — baseball pitching only
  pie_v2?: PieV2CaptureBag;
}

export function useMicroLayerInput() {
  const [repData, setRepData] = useState<MicroLayerData[]>([]);
  const [currentRep, setCurrentRep] = useState<MicroLayerData>({});

  const updateField = useCallback(<K extends keyof MicroLayerData>(field: K, value: MicroLayerData[K]) => {
    setCurrentRep(prev => ({ ...prev, [field]: value }));
  }, []);

  const updatePieV2 = useCallback((patch: PieV2CaptureBag) => {
    setCurrentRep(prev => ({ ...prev, pie_v2: { ...(prev.pie_v2 ?? {}), ...patch } }));
  }, []);

  const commitRep = useCallback(() => {
    setRepData(prev => [...prev, currentRep]);
    setCurrentRep({});
  }, [currentRep]);

  const removeRep = useCallback((index: number) => {
    setRepData(prev => prev.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback(() => {
    setRepData([]);
    setCurrentRep({});
  }, []);

  return { repData, currentRep, updateField, updatePieV2, commitRep, removeRep, reset };
}
