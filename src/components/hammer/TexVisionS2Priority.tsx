import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTexVisionAccess } from '@/hooks/useTexVisionAccess';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

/** Read-only presentation of the existing sport-specific 16-week S2 cadence. */
export function useTexVisionS2Priority() {
  const { user } = useAuth();
  const { hasAccess, loading: accessLoading } = useTexVisionAccess();
  const sport = typeof window !== 'undefined' && localStorage.getItem('selectedSport') === 'softball' ? 'softball' : 'baseball';
  const query = useQuery({
    queryKey: ['tex-vision-s2-priority', user?.id, sport],
    enabled: !!user?.id && hasAccess && !accessLoading,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('tex_vision_s2_diagnostics')
        .select('test_date,next_test_date,processing_speed_score,decision_efficiency_score,visual_motor_integration_score,visual_tracking_score,peripheral_awareness_score,processing_under_load_score,impulse_control_score,fatigue_index_score')
        .eq('user_id', user?.id ?? '').eq('sport', sport)
        .order('test_date', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const baseline = query.data;
  // S2 dates are calendar dates: compare in the athlete's local day, not UTC midnight.
  const today = new Date();
  const localDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const due = !query.isLoading && !query.isError && hasAccess && (!baseline || !baseline.next_test_date || baseline.next_test_date <= localDay);
  return { due: !!due, baseline, hasAccess, loading: accessLoading || query.isLoading };
}

export function TexVisionS2Priority() {
  const navigate = useNavigate();
  const { due, baseline } = useTexVisionS2Priority();
  if (!due) return null;
  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-3" aria-label="Due today: Tex Vision S2">
      <p className="text-xs font-semibold text-primary">Due today · Tex Vision S2</p>
      <p className="mt-1 text-sm">{baseline ? 'Your next S2 assessment is ready.' : 'Complete your S2 baseline to guide future vision work.'}</p>
      <Button size="sm" variant="outline" className="mt-2" onClick={() => navigate('/tex-vision#s2')}>Open S2 assessment</Button>
    </div>
  );
}