import { useState, useCallback } from 'react';

export interface MicroLayerData {
  pitch_location?: { row: number; col: number }; // 3x3 or 5x5 grid
  swing_decision?: 'correct' | 'incorrect';
  contact_quality?: 'miss' | 'foul' | 'weak' | 'hard' | 'barrel';
  exit_direction?: 'pull' | 'middle' | 'oppo' | 'slap_side';
  situation_tag?: { runners: string; outs: number };
  count?: { balls: number; strikes: number };
  pitcher_hand?: 'L' | 'R';
  batter_side?: 'L' | 'R';
  velocity_band?: string;
  spin_rate?: number;
  pitcher_style_tag?: 'riseball' | 'dropball' | 'speed' | 'spin';
  // Stream 3: additional micro fields
  in_zone?: boolean; // true if pitch is in strike zone — for chase tracking
  batted_ball_type?: 'ground' | 'line' | 'fly' | 'barrel';
  spin_direction?: 'topspin' | 'backspin' | 'sidespin';
  swing_intent?: 'mechanical' | 'game_intent' | 'situational' | 'hr_derby';
  execution_score?: number; // 1-10
  // Fielding micro
  play_type?: 'ground_ball' | 'fly_ball' | 'line_drive' | 'bunt' | 'pop_up';
  fielding_result?: 'clean' | 'error' | 'assist';
  throw_accuracy_grade?: number; // 20-80
  footwork_grade?: number; // 20-80
  exchange_time_band?: 'fast' | 'average' | 'slow';
  throw_spin_quality?: 'carry' | 'tail' | 'cut' | 'neutral';
  // Pitching micro
  spin_efficiency_pct?: number;
  pitch_command_grade?: number; // 20-80
  miss_direction?: 'arm_side' | 'glove_side' | 'up' | 'down';
}

export function useMicroLayerInput() {
  const [repData, setRepData] = useState<MicroLayerData[]>([]);
  const [currentRep, setCurrentRep] = useState<MicroLayerData>({});

  const updateField = useCallback(<K extends keyof MicroLayerData>(field: K, value: MicroLayerData[K]) => {
    setCurrentRep(prev => ({ ...prev, [field]: value }));
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

  return { repData, currentRep, updateField, commitRep, removeRep, reset };
}
