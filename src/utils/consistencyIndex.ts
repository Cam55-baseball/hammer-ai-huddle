import { supabase } from '@/integrations/supabase/client';

export interface ConsistencyResult {
  consistencyScore: number; // 0-100, % of logged days
  loggedStreak: number;     // consecutive logged days
  missedStreak: number;     // consecutive missed days
  totalLogged: number;
  totalMissed: number;
  injuryHoldDays: number;
  dampingMultiplier: number; // 1.0 = no dampening, lower = dampened
}

/**
 * Calculate consistency index from athlete_daily_log over last 30 days.
 * Excludes injury_hold days from denominator.
 */
export async function calculateConsistencyIndex(userId: string): Promise<ConsistencyResult> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  
  const { data: logs } = await supabase
    .from('athlete_daily_log')
    .select('entry_date, day_status, injury_mode')
    .eq('user_id', userId)
    .gte('entry_date', thirtyDaysAgo)
    .order('entry_date', { ascending: true });

  const entries = logs ?? [];
  
  // Build a map of date -> status
  const statusMap = new Map<string, string>();
  let injuryHoldDays = 0;
  for (const entry of entries) {
    statusMap.set(entry.entry_date, entry.day_status);
    if (entry.injury_mode) injuryHoldDays++;
  }

  // Count logged vs missed over 30 days
  const today = new Date();
  let totalLogged = 0;
  let totalMissed = 0;
  let currentLoggedStreak = 0;
  let currentMissedStreak = 0;
  let maxLoggedStreak = 0;
  
  // Track last 7 and 14 day missed counts for dampening
  let missed7 = 0;
  let missed14 = 0;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const status = statusMap.get(dateStr);

    if (status && status !== 'missed') {
      totalLogged++;
      currentLoggedStreak++;
      currentMissedStreak = 0;
      if (currentLoggedStreak > maxLoggedStreak) maxLoggedStreak = currentLoggedStreak;
    } else if (status === 'missed' || !status) {
      // No entry or explicitly missed
      totalMissed++;
      currentMissedStreak++;
      currentLoggedStreak = 0;
      if (i < 7) missed7++;
      if (i < 14) missed14++;
    }
  }

  // Consistency = logged / (30 - injury_hold_days)
  const denominator = Math.max(1, 30 - injuryHoldDays);
  const consistencyScore = Math.round((totalLogged / denominator) * 100);

  // Development dampening logic
  let dampingMultiplier = 1.0;
  if (missed7 >= 2) dampingMultiplier = 0.95;   // 2+ missed in 7 days
  if (missed14 >= 4) dampingMultiplier = 0.85;   // 4+ missed in 14 days
  // If consistency recovers above 80%, dampening lifts
  if (consistencyScore >= 80) dampingMultiplier = 1.0;

  return {
    consistencyScore,
    loggedStreak: currentLoggedStreak,
    missedStreak: currentMissedStreak,
    totalLogged,
    totalMissed,
    injuryHoldDays,
    dampingMultiplier,
  };
}

/**
 * Dual streak system:
 * - Performance Streak: broken only by 'missed' status
 * - Discipline Streak: broken by no row at all for a date
 */
export function computeStreaks(logs: Array<{ entry_date: string; day_status: string }>): {
  performanceStreak: number;
  disciplineStreak: number;
} {
  const statusMap = new Map(logs.map(l => [l.entry_date, l.day_status]));
  const today = new Date();
  let performanceStreak = 0;
  let disciplineStreak = 0;

  // Count backwards from today
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const status = statusMap.get(dateStr);

    // Performance streak: any logged status except 'missed'
    if (i <= performanceStreak) {
      if (status && status !== 'missed') {
        performanceStreak++;
      }
    }

    // Discipline streak: any row exists (user intentionally logged something)
    if (i <= disciplineStreak) {
      if (status !== undefined) {
        disciplineStreak++;
      }
    }
  }

  return { performanceStreak, disciplineStreak };
}
