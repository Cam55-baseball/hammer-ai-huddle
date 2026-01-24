import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  ALL_DRILLS, 
  DrillDefinition, 
  DrillTier, 
  DrillCategory,
  isTierUnlocked,
  DRILL_CATEGORIES 
} from '@/constants/texVisionDrills';

// Scoring constants for drill prioritization
const RECENCY_MAX_DAYS = 14;       // Drill not done in 14+ days = max recency points
const TARGET_ACCURACY = 85;        // Target accuracy for performance scoring
const NEVER_DONE_BOOST = 100;      // Massive boost for untried drills
const VARIETY_BONUS = 30;          // Bonus for adding category diversity
const HIGHEST_TIER_BONUS = 25;     // Bonus for drills in user's highest tier
const DAILY_DRILL_COUNT = 4;       // Number of drills to select per day

export type SelectionReason = 
  | 'never_done'       // Never attempted
  | 'needs_practice'   // Below target accuracy
  | 'due_review'       // Not done recently
  | 'tier_challenge'   // From highest unlocked tier
  | 'variety';         // Category diversity

export interface ScoredDrill extends DrillDefinition {
  totalScore: number;
  recencyScore: number;
  performanceScore: number;
  neverDoneBoost: number;
  varietyScore: number;
  tierBonus: number;
  reason: SelectionReason;
  reasonText: string;
  lastCompleted: string | null;
  avgAccuracy: number | null;
}

export interface DailyDrillSelection {
  id: string;
  user_id: string;
  sport: string;
  selection_date: string;
  selected_drills: ScoredDrill[];
  selection_reasons: Record<string, SelectionReason>;
  created_at: string;
}

interface DrillHistory {
  lastCompleted: string | null;
  avgAccuracy: number | null;
  completionCount: number;
}

// Calculate days since a date
const daysSinceDate = (dateStr: string): number => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// Build reason text for display
const buildReasonText = (reason: SelectionReason, avgAccuracy: number | null, daysSince: number | null): string => {
  switch (reason) {
    case 'never_done':
      return 'New drill – try it out!';
    case 'needs_practice':
      return `${avgAccuracy?.toFixed(0) ?? 0}% avg – practice recommended`;
    case 'due_review':
      return daysSince !== null ? `${daysSince}+ days ago – time to refresh` : 'Due for review';
    case 'tier_challenge':
      return 'Push your limits!';
    case 'variety':
      return 'Category balance';
    default:
      return '';
  }
};

export const useDailyDrillSelection = (
  currentTier: DrillTier = 'beginner',
  sport: string = 'baseball'
) => {
  const { user } = useAuth();
  const [dailyDrills, setDailyDrills] = useState<ScoredDrill[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectionDate, setSelectionDate] = useState<string | null>(null);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  // Fetch drill history for scoring
  const fetchDrillHistory = useCallback(async (userId: string): Promise<Record<string, DrillHistory>> => {
    const { data, error } = await supabase
      .from('tex_vision_drill_results')
      .select('drill_type, accuracy_percent, completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error fetching drill history:', error);
      return {};
    }

    const historyMap: Record<string, DrillHistory> = {};

    (data || []).forEach(result => {
      if (!historyMap[result.drill_type]) {
        historyMap[result.drill_type] = {
          lastCompleted: result.completed_at,
          avgAccuracy: result.accuracy_percent,
          completionCount: 1,
        };
      } else {
        const existing = historyMap[result.drill_type];
        existing.completionCount++;
        // Running average
        if (result.accuracy_percent !== null && existing.avgAccuracy !== null) {
          existing.avgAccuracy = 
            (existing.avgAccuracy * (existing.completionCount - 1) + result.accuracy_percent) / 
            existing.completionCount;
        }
      }
    });

    return historyMap;
  }, []);

  // Score all available drills
  const calculateDrillScores = useCallback((
    availableDrills: DrillDefinition[],
    historyMap: Record<string, DrillHistory>,
    userTier: DrillTier
  ): ScoredDrill[] => {
    return availableDrills.map(drill => {
      const history = historyMap[drill.id];
      
      // Recency Score: More days since last attempt = higher score
      let recencyScore = 0;
      let daysSince: number | null = null;
      if (history?.lastCompleted) {
        daysSince = daysSinceDate(history.lastCompleted);
        recencyScore = Math.min(daysSince / RECENCY_MAX_DAYS, 1) * 100;
      } else {
        recencyScore = 100; // Never done = max recency
      }

      // Performance Score: Lower accuracy = higher priority
      let performanceScore = 0;
      const avgAccuracy = history?.avgAccuracy ?? null;
      if (avgAccuracy !== null) {
        const performanceGap = Math.max(0, TARGET_ACCURACY - avgAccuracy);
        performanceScore = (performanceGap / TARGET_ACCURACY) * 50;
      } else {
        performanceScore = 25; // Unknown = moderate priority
      }

      // Never done boost
      const neverDoneBoost = history ? 0 : NEVER_DONE_BOOST;

      // Tier bonus: Encourage drills at user's current tier
      const tierBonus = drill.tier === userTier ? HIGHEST_TIER_BONUS : 0;

      // Determine primary reason
      let reason: SelectionReason = 'variety';
      if (!history) {
        reason = 'never_done';
      } else if (avgAccuracy !== null && avgAccuracy < 70) {
        reason = 'needs_practice';
      } else if (daysSince !== null && daysSince >= 7) {
        reason = 'due_review';
      } else if (drill.tier === userTier) {
        reason = 'tier_challenge';
      }

      const totalScore = recencyScore + performanceScore + neverDoneBoost + tierBonus;

      return {
        ...drill,
        totalScore,
        recencyScore,
        performanceScore,
        neverDoneBoost,
        varietyScore: 0, // Will be calculated during selection
        tierBonus,
        reason,
        reasonText: buildReasonText(reason, avgAccuracy, daysSince),
        lastCompleted: history?.lastCompleted ?? null,
        avgAccuracy,
      };
    });
  }, []);

  // Select top 4 drills with category balance
  const selectDailyDrills = useCallback((
    scoredDrills: ScoredDrill[],
    userTier: DrillTier
  ): ScoredDrill[] => {
    const selected: ScoredDrill[] = [];
    const usedCategories = new Set<DrillCategory>();
    
    // Sort by total score descending
    const ranked = [...scoredDrills].sort((a, b) => b.totalScore - a.totalScore);

    // Rule 1: Ensure at least 1 drill from highest unlocked tier
    const highestTierDrill = ranked.find(d => d.tier === userTier);
    if (highestTierDrill) {
      selected.push({ ...highestTierDrill, reason: 'tier_challenge', reasonText: 'Push your limits!' });
      usedCategories.add(highestTierDrill.category);
    }

    // Rule 2: Fill remaining slots with top-scored drills, favoring category diversity
    for (const drill of ranked) {
      if (selected.length >= DAILY_DRILL_COUNT) break;
      if (selected.some(s => s.id === drill.id)) continue;

      // Apply variety bonus for new categories
      const drillWithBonus = { ...drill };
      if (!usedCategories.has(drill.category) && selected.length > 0) {
        drillWithBonus.varietyScore = VARIETY_BONUS;
        drillWithBonus.totalScore += VARIETY_BONUS;
      }

      selected.push(drillWithBonus);
      usedCategories.add(drill.category);
    }

    // Rule 3: Ensure at least 2 different categories if possible
    if (usedCategories.size < 2 && selected.length >= 2) {
      // Try to swap lowest-scoring drill with one from different category
      const missingCategories = DRILL_CATEGORIES.filter(c => !usedCategories.has(c));
      for (const category of missingCategories) {
        const replacement = ranked.find(d => 
          d.category === category && !selected.some(s => s.id === d.id)
        );
        if (replacement && selected.length > 1) {
          // Replace lowest scoring drill
          const lowestIdx = selected.length - 1;
          selected[lowestIdx] = { 
            ...replacement, 
            varietyScore: VARIETY_BONUS,
            reason: 'variety',
            reasonText: 'Category balance'
          };
          break;
        }
      }
    }

    return selected;
  }, []);

  // Save selection to database
  const saveSelection = useCallback(async (
    userId: string,
    drills: ScoredDrill[],
    date: string
  ): Promise<void> => {
    const selectionReasons: Record<string, SelectionReason> = {};
    drills.forEach(d => {
      selectionReasons[d.id] = d.reason;
    });

    // Check if selection already exists
    const { data: existing } = await supabase
      .from('tex_vision_daily_drill_selection')
      .select('id')
      .eq('user_id', userId)
      .eq('sport', sport)
      .eq('selection_date', date)
      .maybeSingle();

    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from('tex_vision_daily_drill_selection')
        .update({
          selected_drills: JSON.parse(JSON.stringify(drills)),
          selection_reasons: JSON.parse(JSON.stringify(selectionReasons)),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating daily drill selection:', updateError);
      }
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('tex_vision_daily_drill_selection')
        .insert({
          user_id: userId,
          sport,
          selection_date: date,
          selected_drills: JSON.parse(JSON.stringify(drills)),
          selection_reasons: JSON.parse(JSON.stringify(selectionReasons)),
        });

      if (insertError) {
        console.error('Error inserting daily drill selection:', insertError);
      }
    }
  }, [sport]);

  // Load or generate today's selection
  const loadOrGenerateSelection = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const today = getTodayDate();
    setLoading(true);

    try {
      // Check if we already have today's selection
      const { data: existingSelection, error: fetchError } = await supabase
        .from('tex_vision_daily_drill_selection')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', sport)
        .eq('selection_date', today)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching daily selection:', fetchError);
      }

      if (existingSelection?.selected_drills) {
        // Use cached selection
        const drills = existingSelection.selected_drills as unknown as ScoredDrill[];
        setDailyDrills(drills);
        setSelectionDate(today);
        setLoading(false);
        return;
      }

      // Generate new selection
      const historyMap = await fetchDrillHistory(user.id);
      const availableDrills = ALL_DRILLS.filter(d => isTierUnlocked(d.tier, currentTier));
      const scoredDrills = calculateDrillScores(availableDrills, historyMap, currentTier);
      const selectedDrills = selectDailyDrills(scoredDrills, currentTier);

      // Save to database
      await saveSelection(user.id, selectedDrills, today);

      setDailyDrills(selectedDrills);
      setSelectionDate(today);
    } catch (error) {
      console.error('Error in loadOrGenerateSelection:', error);
    } finally {
      setLoading(false);
    }
  }, [user, sport, currentTier, fetchDrillHistory, calculateDrillScores, selectDailyDrills, saveSelection]);

  // Refresh selection (rate-limited regeneration)
  const refreshSelection = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    const today = getTodayDate();

    // Delete existing selection to regenerate
    const { error: deleteError } = await supabase
      .from('tex_vision_daily_drill_selection')
      .delete()
      .eq('user_id', user.id)
      .eq('sport', sport)
      .eq('selection_date', today);

    if (deleteError) {
      console.error('Error deleting selection for refresh:', deleteError);
      return false;
    }

    // Regenerate
    await loadOrGenerateSelection();
    return true;
  }, [user, sport, loadOrGenerateSelection]);

  // Initial load
  useEffect(() => {
    loadOrGenerateSelection();
  }, [loadOrGenerateSelection]);

  // Re-generate if tier changes
  useEffect(() => {
    if (dailyDrills && selectionDate === getTodayDate()) {
      // Check if any selected drills are no longer accessible (shouldn't happen normally)
      // or if tier upgraded, we might want to include higher tier drills
      const hasInaccessibleDrills = dailyDrills.some(d => !isTierUnlocked(d.tier, currentTier));
      const hasNoHighTierDrills = !dailyDrills.some(d => d.tier === currentTier);
      
      if (hasInaccessibleDrills || (currentTier !== 'beginner' && hasNoHighTierDrills)) {
        refreshSelection();
      }
    }
  }, [currentTier, dailyDrills, selectionDate, refreshSelection]);

  return {
    dailyDrills,
    loading,
    selectionDate,
    refreshSelection,
    refetch: loadOrGenerateSelection,
  };
};
