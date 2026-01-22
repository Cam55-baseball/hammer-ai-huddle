import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RecapCountdownData {
  daysUntilRecap: number;
  recapProgress: number;
  canGenerateRecap: boolean;
  hasMissedRecap: boolean;
  missedCycleEnd: Date | null;
  loading: boolean;
  anchorDate: Date | null;
  waitingForProgressReports: boolean;
  progressReportsUnlockedAt: Date | null;
  refetch: () => void;
}

/**
 * Shared hook for consistent 6-week recap countdown calculation.
 * Uses vault_streaks.created_at as the anchor date, falling back to subscriptions.created_at.
 * The countdown is based on 42-day cycles from the anchor date.
 * 
 * New features:
 * - Detects missed recaps (cycle completed without generating a recap)
 * - Provides 7-day grace period after cycle ends to generate recap
 * - Returns hasMissedRecap and missedCycleEnd for UI indicators
 */
export function useRecapCountdown(): RecapCountdownData {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [daysUntilRecap, setDaysUntilRecap] = useState(42);
  const [recapProgress, setRecapProgress] = useState(0);
  const [canGenerateRecap, setCanGenerateRecap] = useState(false);
  const [hasMissedRecap, setHasMissedRecap] = useState(false);
  const [missedCycleEnd, setMissedCycleEnd] = useState<Date | null>(null);
  const [anchorDate, setAnchorDate] = useState<Date | null>(null);
  const [waitingForProgressReports, setWaitingForProgressReports] = useState(false);
  const [progressReportsUnlockedAt, setProgressReportsUnlockedAt] = useState<Date | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refetch = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const calculateCountdown = useCallback(async (startDate: Date, userId: string) => {
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const completedCycles = Math.floor(daysSinceStart / 42);
    const daysInCurrentCycle = daysSinceStart % 42;
    const remaining = 42 - daysInCurrentCycle;
    
    setDaysUntilRecap(remaining);
    setRecapProgress(Math.round((daysInCurrentCycle / 42) * 100));
    
    // Fetch the latest recap to check if we've already generated one for the current/previous cycle
    const { data: latestRecap } = await supabase
      .from('vault_recaps')
      .select('recap_period_end, generated_at, unlocked_progress_reports_at')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Calculate cycle boundaries
    const currentCycleStartMs = startDate.getTime() + (completedCycles * 42 * 24 * 60 * 60 * 1000);
    const currentCycleStart = new Date(currentCycleStartMs);
    const previousCycleEndMs = currentCycleStartMs - 1; // Last moment of previous cycle
    const previousCycleEnd = completedCycles > 0 ? new Date(previousCycleEndMs) : null;
    
    // Determine recap status
    let canGenerate = false;
    let hasMissed = false;
    let missedEnd: Date | null = null;
    let waitingForReports = false;
    let unlockedAt: Date | null = null;
    
    if (completedCycles > 0) {
      // At least one cycle has been completed
      if (latestRecap) {
        const latestRecapEnd = new Date(latestRecap.recap_period_end);
        
        // Check if the latest recap covers the most recent completed cycle
        // A recap is considered "covering" a cycle if its end date is within that cycle's period
        const recapCoversCurrentCycle = latestRecapEnd >= currentCycleStart;
        const recapCoversPreviousCycle = previousCycleEnd && latestRecapEnd >= new Date(currentCycleStart.getTime() - 42 * 24 * 60 * 60 * 1000);
        
        if (!recapCoversCurrentCycle && !recapCoversPreviousCycle) {
          // User missed generating a recap for the previous cycle
          hasMissed = true;
          missedEnd = previousCycleEnd;
          canGenerate = true;
        } else if (!recapCoversCurrentCycle && daysInCurrentCycle <= 7) {
          // Within 7-day grace period of new cycle, can still generate
          canGenerate = true;
        }
        
        // Check if waiting for progress reports
        // If recap was generated and unlocked_progress_reports_at is set, check if progress reports were completed
        if (latestRecap.unlocked_progress_reports_at) {
          unlockedAt = new Date(latestRecap.unlocked_progress_reports_at);
          
          // Check if any performance tests or progress photos were added after the unlock date
          const [{ data: perfTests }, { data: photos }] = await Promise.all([
            supabase
              .from('vault_performance_tests')
              .select('id')
              .eq('user_id', userId)
              .gt('created_at', latestRecap.unlocked_progress_reports_at)
              .limit(1),
            supabase
              .from('vault_progress_photos')
              .select('id')
              .eq('user_id', userId)
              .gt('created_at', latestRecap.unlocked_progress_reports_at)
              .limit(1)
          ]);
          
          const hasProgressReports = (perfTests && perfTests.length > 0) || (photos && photos.length > 0);
          
          // If no progress reports after unlock, user is waiting to complete them
          if (!hasProgressReports) {
            waitingForReports = true;
            // While waiting, don't allow generating another recap
            canGenerate = false;
            hasMissed = false;
          }
        }
      } else {
        // No recaps exist, user has missed all previous cycles
        // Allow generating for the most recent completed cycle
        hasMissed = true;
        missedEnd = previousCycleEnd;
        canGenerate = true;
      }
    }
    
    // Also allow generation if exactly at day 0 (cycle just completed) or within grace period
    // But not if waiting for progress reports
    if (daysInCurrentCycle <= 7 && completedCycles > 0 && !waitingForReports) {
      // Check if we already have a recap for this cycle period
      if (latestRecap) {
        const latestRecapEnd = new Date(latestRecap.recap_period_end);
        const cycleStartForCheck = new Date(startDate.getTime() + ((completedCycles - 1) * 42 * 24 * 60 * 60 * 1000));
        if (latestRecapEnd < cycleStartForCheck) {
          canGenerate = true;
        }
      } else {
        canGenerate = true;
      }
    }
    
    setCanGenerateRecap(canGenerate);
    setHasMissedRecap(hasMissed);
    setMissedCycleEnd(missedEnd);
    setWaitingForProgressReports(waitingForReports);
    setProgressReportsUnlockedAt(unlockedAt);
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
          await calculateCountdown(anchor, user.id);
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
          await calculateCountdown(anchor, user.id);
        } else {
          // No anchor found, use default values
          setDaysUntilRecap(42);
          setRecapProgress(0);
          setCanGenerateRecap(false);
          setHasMissedRecap(false);
          setMissedCycleEnd(null);
        }
      } catch (error) {
        console.error('Error fetching recap countdown anchor:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnchorDate();
  }, [user, calculateCountdown, refreshTrigger]);

  return {
    daysUntilRecap,
    recapProgress,
    canGenerateRecap,
    hasMissedRecap,
    missedCycleEnd,
    loading,
    anchorDate,
    waitingForProgressReports,
    progressReportsUnlockedAt,
    refetch,
  };
}
