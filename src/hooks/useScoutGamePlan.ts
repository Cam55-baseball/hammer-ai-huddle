import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface PlayerReviewTask {
  id: string;
  name: string;
  avatarUrl: string | null;
  unreviewedCount: number;
  latestVideoDate: string | null;
}

export interface ScoutGamePlanData {
  players: PlayerReviewTask[];
  totalUnreviewed: number;
  loading: boolean;
  refetch: () => void;
}

export const useScoutGamePlan = (): ScoutGamePlanData => {
  const { user } = useAuth();
  const [players, setPlayers] = useState<PlayerReviewTask[]>([]);
  const [totalUnreviewed, setTotalUnreviewed] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPendingReviews = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('get-scout-pending-reviews');

      if (error) {
        console.error('[useScoutGamePlan] Error fetching pending reviews:', error);
        setPlayers([]);
        setTotalUnreviewed(0);
      } else if (data) {
        setPlayers(data.players || []);
        setTotalUnreviewed(data.totalUnreviewed || 0);
      }
    } catch (error) {
      console.error('[useScoutGamePlan] Error:', error);
      setPlayers([]);
      setTotalUnreviewed(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPendingReviews();
  }, [fetchPendingReviews]);

  return {
    players,
    totalUnreviewed,
    loading,
    refetch: fetchPendingReviews,
  };
};

export const markVideoAsReviewed = async (videoId: string, playerId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.functions.invoke('mark-video-reviewed', {
      body: { videoId, playerId },
    });

    if (error) {
      console.error('[markVideoAsReviewed] Error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[markVideoAsReviewed] Error:', error);
    return false;
  }
};
