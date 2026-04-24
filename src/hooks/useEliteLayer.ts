import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface EliteLayer {
  state: 'prime' | 'ready' | 'caution' | 'recover';
  elite_message: string;
  micro_directive: string;
  constraint_text: string;
  confidence: number;
}

export function useEliteLayer() {
  const { user } = useAuth();
  const [layer, setLayer] = useState<EliteLayer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from('hammer_state_explanations_v2')
        .select('state,elite_message,micro_directive,constraint_text,confidence')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) {
        setLayer(data as EliteLayer | null);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel(`elite-layer-${user.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'hammer_state_explanations_v2', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (active) setLayer(payload.new as EliteLayer);
        })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [user?.id]);

  return { layer, loading };
}
