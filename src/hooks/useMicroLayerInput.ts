import { useState, useCallback } from 'react';

export interface MicroLayerData {
  pitch_location?: { row: number; col: number }; // 3x3 grid
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
