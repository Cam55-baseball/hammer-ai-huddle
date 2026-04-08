import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useGamePlays(gameId: string | null) {
  const [plays, setPlays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    supabase
      .from('game_plays')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setPlays(data as any[]);
        setLoading(false);
      });
  }, [gameId]);

  return { plays, loading };
}
