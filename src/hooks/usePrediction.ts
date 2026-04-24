import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type PredictedState = 'prime' | 'ready' | 'caution' | 'recover';

export interface Prediction {
  id: string;
  base_snapshot_id: string | null;
  predicted_state_24h: PredictedState;
  predicted_state_48h: PredictedState;
  predicted_state_72h: PredictedState;
  confidence_24h: number;
  confidence_48h: number;
  confidence_72h: number;
  risk_flags: string[];
  created_at: string;
}

export interface Intervention {
  id: string;
  prediction_id: string | null;
  trigger_reason: string;
  intervention_type: 'reduce_load' | 'increase_intensity' | 'recover' | 'stabilize';
  directive: string;
  priority: number;
  executed: boolean;
  created_at: string;
}

export function usePrediction(currentState?: string) {
  const { user } = useAuth();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let active = true;

    const load = async () => {
      const [{ data: pred }, { data: itv }] = await Promise.all([
        supabase.from('engine_state_predictions')
          .select('*').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('engine_interventions')
          .select('*').eq('user_id', user.id).eq('executed', false)
          .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (active) {
        setPrediction(pred as Prediction | null);
        setIntervention(itv as Intervention | null);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel(`prediction-${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'engine_state_predictions', filter: `user_id=eq.${user.id}` },
        (payload) => { if (active) setPrediction(payload.new as Prediction); })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'engine_interventions', filter: `user_id=eq.${user.id}` },
        (payload) => { if (active) setIntervention(payload.new as Intervention); })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [user?.id]);

  const hasMeaningfulSignal = !!(
    prediction &&
    prediction.confidence_24h >= 60 &&
    currentState &&
    prediction.predicted_state_24h !== currentState
  );

  return { prediction, intervention, hasMeaningfulSignal, loading };
}
