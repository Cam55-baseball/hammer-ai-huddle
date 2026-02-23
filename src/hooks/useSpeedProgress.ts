import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import {
  SportType,
  getDistancesForSport,
  getTrackForTimes,
  generateSessionDrills,
  getSessionFocus,
  SPEED_UNLOCK_DELAY_MS,
  PLATEAU_THRESHOLD_SESSIONS,
  READINESS_BREAK_THRESHOLD,
  BREAK_DAY_DRILLS,
  SessionTemplate,
  SpeedTrackTier,
  SessionFocus,
  DistanceConfig,
  calculateReadiness,
  getBestTime,
} from '@/data/speedLabProgram';

export interface SpeedSession {
  id: string;
  user_id: string;
  sport: string;
  session_number: number;
  session_date: string;
  distances: Record<string, number | number[]>;
  rpe: number | null;
  body_feel_before: string | null;
  body_feel_after: string | null;
  sleep_rating: number | null;
  pain_areas: string[];
  drill_log: string[];
  is_break_day: boolean;
  readiness_score: number | null;
  notes: string | null;
  created_at: string;
}

export interface SpeedGoals {
  id: string;
  user_id: string;
  sport: string;
  current_track: string;
  goal_distances: Record<string, number>;
  weeks_without_improvement: number;
  last_adjustment_date: string | null;
  adjustment_history: Array<{ date: string; action: string; reason: string }>;
  personal_bests: Record<string, number>;
  program_status: 'not_started' | 'active' | 'paused';
  created_at: string;
  updated_at: string;
}

export interface SpeedProgressState {
  initialized: boolean;
  lastSessionTime: Date | null;
  sessionNumber: number;
  isLocked: boolean;
  unlockTime: Date | null;
  isBreakDay: boolean;
  readinessScore: number;
}

export function useSpeedProgress(sport: SportType) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SpeedSession[]>([]);
  const [goals, setGoals] = useState<SpeedGoals | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // ─── Fetch Sessions & Goals ─────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [sessionsRes, goalsRes] = await Promise.all([
        supabase
          .from('speed_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('sport', sport)
          .order('session_number', { ascending: false })
          .limit(50),
        supabase
          .from('speed_goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('sport', sport)
          .maybeSingle(),
      ]);

      if (sessionsRes.error) throw sessionsRes.error;
      if (goalsRes.error) throw goalsRes.error;

      const sessData = (sessionsRes.data || []).map((s: any) => ({
        ...s,
        distances: s.distances || {},
        pain_areas: s.pain_areas || [],
        drill_log: s.drill_log || [],
      })) as SpeedSession[];

      setSessions(sessData);
      setGoals(goalsRes.data ? {
        ...goalsRes.data,
        goal_distances: goalsRes.data.goal_distances || {},
        adjustment_history: (goalsRes.data.adjustment_history as any) || [],
        personal_bests: goalsRes.data.personal_bests || {},
        program_status: ((goalsRes.data as any).program_status || 'not_started') as 'not_started' | 'active' | 'paused',
      } as SpeedGoals : null);
      setInitialized(sessData.length > 0 || !!goalsRes.data);
    } catch (error) {
      console.error('Error fetching speed data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, sport]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Derived State ──────────────────────────────────────────────────

  const lastSession = sessions[0] || null;
  const nextSessionNumber = lastSession ? lastSession.session_number + 1 : 1;

  const lastSessionTime = useMemo(() => {
    if (!lastSession) return null;
    return new Date(lastSession.created_at);
  }, [lastSession]);

  const unlockTime = useMemo(() => {
    if (!lastSessionTime) return null;
    return new Date(lastSessionTime.getTime() + SPEED_UNLOCK_DELAY_MS);
  }, [lastSessionTime]);

  const isLocked = useMemo(() => {
    if (!unlockTime) return false;
    return new Date() < unlockTime;
  }, [unlockTime]);

  const personalBests = goals?.personal_bests || {};
  const currentTrack = useMemo(() => {
    return getTrackForTimes(sport, personalBests);
  }, [sport, personalBests]);

  const distances = useMemo(() => getDistancesForSport(sport), [sport]);
  const sessionFocus = useMemo(() => getSessionFocus(nextSessionNumber), [nextSessionNumber]);
  const sessionDrills = useMemo(() => generateSessionDrills(nextSessionNumber), [nextSessionNumber]);

  // ─── Break Day Detection ────────────────────────────────────────────

  const detectBreakDay = useCallback((): boolean => {
    if (sessions.length < 2) return false;

    const last = sessions[0];
    const prev = sessions[1];

    // Back-to-back high RPE
    if ((last?.rpe || 0) >= 8 && (prev?.rpe || 0) >= 8) return true;

    // Poor sleep on last session
    if ((last?.sleep_rating || 5) <= 2) return true;

    // 3+ pain areas flagged
    if ((last?.pain_areas?.length || 0) >= 3) return true;

    // Declining sprint quality (check if last 2 sessions slower than PBs by > 5%)
    if (personalBests && last?.distances) {
      const distKeys = Object.keys(last.distances);
      let declineCount = 0;
      for (const key of distKeys) {
        const pb = personalBests[key];
        const lastTime = getBestTime(last.distances[key]);
        if (pb && lastTime > 0 && lastTime > pb * 1.05) {
          declineCount++;
        }
      }
      if (declineCount >= 2) return true;
    }

    return false;
  }, [sessions, personalBests]);

  const isBreakDay = useMemo(() => detectBreakDay(), [detectBreakDay]);

  // ─── Program Status ──────────────────────────────────────────────

  const programStatus = goals?.program_status as 'not_started' | 'active' | 'paused' || 'not_started';

  // ─── Initialize Journey ─────────────────────────────────────────────

  const initializeJourney = useCallback(async () => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('speed_goals')
        .insert({
          user_id: user.id,
          sport,
          current_track: 'building_speed',
          goal_distances: {},
          personal_bests: {},
          weeks_without_improvement: 0,
          adjustment_history: [],
          program_status: 'active',
        });

      if (error) throw error;
      setInitialized(true);
      await fetchData();
      return true;
    } catch (error) {
      console.error('Error initializing speed journey:', error);
      toast({ title: 'Error', description: 'Failed to start speed journey', variant: 'destructive' });
      return false;
    }
  }, [user, sport, fetchData]);

  const pauseProgram = useCallback(async () => {
    if (!user || !goals) return;
    try {
      const { error } = await supabase
        .from('speed_goals')
        .update({ program_status: 'paused' })
        .eq('id', goals.id);
      if (error) throw error;
      setGoals(prev => prev ? { ...prev, program_status: 'paused' } as SpeedGoals : null);
    } catch (error) {
      console.error('Error pausing speed program:', error);
    }
  }, [user, goals]);

  const resumeProgram = useCallback(async () => {
    if (!user || !goals) return;
    try {
      const { error } = await supabase
        .from('speed_goals')
        .update({ program_status: 'active' })
        .eq('id', goals.id);
      if (error) throw error;
      setGoals(prev => prev ? { ...prev, program_status: 'active' } as SpeedGoals : null);
    } catch (error) {
      console.error('Error resuming speed program:', error);
    }
  }, [user, goals]);

  // ─── Save Session ───────────────────────────────────────────────────

  const saveSession = useCallback(async (sessionData: {
    sleepRating: number;
    bodyFeelBefore: string;
    bodyFeelAfter: string;
    painAreas: string[];
    drillLog: string[];
    distances: Record<string, number | number[]>;
    rpe: number;
    isBreakDay: boolean;
    notes?: string;
  }) => {
    if (!user) return null;

    try {
      // Calculate readiness score
      const readiness = calculateReadiness(sessionData.sleepRating, sessionData.bodyFeelBefore, sessionData.painAreas);

      const { data, error } = await supabase
        .from('speed_sessions')
        .insert({
          user_id: user.id,
          sport,
          session_number: nextSessionNumber,
          session_date: new Date().toISOString().split('T')[0],
          distances: sessionData.distances,
          rpe: sessionData.rpe,
          body_feel_before: sessionData.bodyFeelBefore,
          body_feel_after: sessionData.bodyFeelAfter,
          sleep_rating: sessionData.sleepRating,
          pain_areas: sessionData.painAreas,
          drill_log: sessionData.drillLog,
          is_break_day: sessionData.isBreakDay,
          readiness_score: readiness,
          notes: sessionData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update personal bests & goals
      if (!sessionData.isBreakDay) {
        await updatePersonalBests(sessionData.distances);
      }

      await fetchData();
      return data;
    } catch (error) {
      console.error('Error saving speed session:', error);
      toast({ title: 'Error', description: 'Failed to save session', variant: 'destructive' });
      return null;
    }
  }, [user, sport, nextSessionNumber, fetchData]);

  // ─── Update Personal Bests ──────────────────────────────────────────

  const updatePersonalBests = useCallback(async (newDistances: Record<string, number | number[]>) => {
    if (!user || !goals) return;

    const currentPBs = { ...goals.personal_bests };
    let improved = false;

    for (const [key, timeOrTimes] of Object.entries(newDistances)) {
      const best = getBestTime(timeOrTimes);
      if (best > 0 && (!currentPBs[key] || best < currentPBs[key])) {
        currentPBs[key] = best;
        improved = true;
      }
    }

    // Update track based on new PBs
    const newTrack = getTrackForTimes(sport, currentPBs);
    const newWeeksWithout = improved ? 0 : goals.weeks_without_improvement + 1;

    // Check for auto-adjustment
    let adjustmentHistory = [...(goals.adjustment_history || [])];
    if (newWeeksWithout >= PLATEAU_THRESHOLD_SESSIONS && !improved) {
      adjustmentHistory.push({
        date: new Date().toISOString().split('T')[0],
        action: 'focus_shift',
        reason: `No improvement in ${PLATEAU_THRESHOLD_SESSIONS} sessions`,
      });
    }

    try {
      const { error } = await supabase
        .from('speed_goals')
        .update({
          personal_bests: currentPBs,
          current_track: newTrack.key,
          weeks_without_improvement: newWeeksWithout,
          adjustment_history: adjustmentHistory,
          last_adjustment_date: newWeeksWithout >= PLATEAU_THRESHOLD_SESSIONS
            ? new Date().toISOString().split('T')[0]
            : goals.last_adjustment_date,
        })
        .eq('id', goals.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating personal bests:', error);
    }
  }, [user, goals, sport]);

  // ─── Save Partner Timing ────────────────────────────────────────────

  const savePartnerTiming = useCallback(async (
    sessionId: string,
    distance: string,
    timeSeconds: number,
    timedBy: 'self' | 'partner'
  ) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('speed_partner_timings')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          distance,
          time_seconds: timeSeconds,
          timed_by: timedBy,
        });
      if (error) throw error;
    } catch (error) {
      console.error('Error saving partner timing:', error);
    }
  }, [user]);

  // ─── Trend Analysis ─────────────────────────────────────────────────

  const getTrend = useCallback((distanceKey: string): 'improving' | 'maintaining' | 'needs_attention' => {
    const recentSessions = sessions
      .filter(s => !s.is_break_day && s.distances[distanceKey])
      .slice(0, 5);

    if (recentSessions.length < 2) return 'maintaining';

    const times = recentSessions.map(s => getBestTime(s.distances[distanceKey])).filter(t => t > 0).reverse();
    if (times.length < 2) return 'maintaining';
    const improving = times.every((t, i) => i === 0 || t <= times[i - 1]);
    const declining = times.every((t, i) => i === 0 || t >= times[i - 1]);

    if (improving) return 'improving';
    if (declining) return 'needs_attention';
    return 'maintaining';
  }, [sessions]);

  // ─── Plateau Detection ──────────────────────────────────────────────

  const isPlateaued = useMemo(() => {
    return (goals?.weeks_without_improvement || 0) >= PLATEAU_THRESHOLD_SESSIONS;
  }, [goals]);

  // ─── Streaks ────────────────────────────────────────────────────────

  const streakData = useMemo(() => {
    if (sessions.length === 0) return { current: 0, longest: 0, total: 0 };

    let current = 0;
    let longest = 0;
    const total = sessions.length;

    // Calculate streak based on consecutive session dates
    const sortedDates = [...new Set(sessions.map(s => s.session_date))].sort().reverse();
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < sortedDates.length; i++) {
      const date = new Date(sortedDates[i]);
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);

      const diff = Math.abs(date.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24);
      if (diff <= 2) { // Allow 2-day gap for rest days
        current++;
      } else {
        break;
      }
    }

    longest = Math.max(current, longest);
    return { current, longest, total };
  }, [sessions]);

  return {
    // State
    loading,
    initialized,
    sessions,
    goals,
    lastSession,
    personalBests,
    programStatus,

    // Computed
    nextSessionNumber,
    isLocked,
    unlockTime,
    isBreakDay,
    currentTrack,
    distances,
    sessionFocus,
    sessionDrills,
    isPlateaued,
    streakData,

    // Actions
    initializeJourney,
    saveSession,
    savePartnerTiming,
    fetchData,
    getTrend,
    pauseProgram,
    resumeProgram,
  };
}

// calculateReadiness and getBestTime are now imported from @/data/speedLabProgram
