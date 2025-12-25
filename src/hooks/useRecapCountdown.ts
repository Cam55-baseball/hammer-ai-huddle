import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RecapCountdownData {
  daysUntilRecap: number;
  recapProgress: number;
  canGenerateRecap: boolean;
  loading: boolean;
  anchorDate: Date | null;
}

/**
 * Shared hook for consistent 6-week recap countdown calculation.
 * Uses vault_streaks.created_at as the anchor date, falling back to subscriptions.created_at.
 * The countdown is based on 42-day cycles from the anchor date.
 */
export function useRecapCountdown(): RecapCountdownData {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [daysUntilRecap, setDaysUntilRecap] = useState(42);
  const [recapProgress, setRecapProgress] = useState(0);
  const [canGenerateRecap, setCanGenerateRecap] = useState(false);
  const [anchorDate, setAnchorDate] = useState<Date | null>(null);

  const calculateCountdown = useCallback((startDate: Date) => {
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysInCycle = daysSinceStart % 42;
    const remaining = 42 - daysInCycle;
    
    setDaysUntilRecap(remaining);
    setRecapProgress(Math.round((daysInCycle / 42) * 100));
    setCanGenerateRecap(daysInCycle >= 42 || remaining === 0);
  }, []);

  useEffect(() => {
    const fetchAnchorDate = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // First try vault_streaks.created_at
        const { data: streakData } = await supabase
          .from('vault_streaks')
          .select('created_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (streakData?.created_at) {
          const anchor = new Date(streakData.created_at);
          setAnchorDate(anchor);
          calculateCountdown(anchor);
          setLoading(false);
          return;
        }

        // Fallback to subscriptions.created_at
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('created_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (subData?.created_at) {
          const anchor = new Date(subData.created_at);
          setAnchorDate(anchor);
          calculateCountdown(anchor);
        } else {
          // No anchor found, use default values
          setDaysUntilRecap(42);
          setRecapProgress(0);
          setCanGenerateRecap(false);
        }
      } catch (error) {
        console.error('Error fetching recap countdown anchor:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnchorDate();
  }, [user, calculateCountdown]);

  return {
    daysUntilRecap,
    recapProgress,
    canGenerateRecap,
    loading,
    anchorDate,
  };
}
