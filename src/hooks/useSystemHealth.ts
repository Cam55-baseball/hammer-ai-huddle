import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SystemHealthBreakdown {
  heartbeat: number | null;
  sentinel: number | null;
  adversarial: number | null;
  regression: number | null;
  prediction: number | null;
  advisory: number | null;
  samples?: Record<string, number>;
}

export interface SystemHealthRow {
  id: string;
  score: number;
  breakdown: SystemHealthBreakdown;
  created_at: string;
}

export function useSystemHealth() {
  const [latest, setLatest] = useState<SystemHealthRow | null>(null);
  const [history, setHistory] = useState<SystemHealthRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('engine_system_health')
      .select('id, score, breakdown, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.warn('[useSystemHealth]', error.message);
      setLatest(null);
      setHistory([]);
    } else if (data && data.length > 0) {
      const rows = data as unknown as SystemHealthRow[];
      setLatest(rows[0]);
      setHistory([...rows].reverse());
    } else {
      setLatest(null);
      setHistory([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('engine_system_health_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'engine_system_health' },
        () => fetchData(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    score: latest?.score ?? null,
    breakdown: latest?.breakdown ?? null,
    history,
    loading,
  };
}
