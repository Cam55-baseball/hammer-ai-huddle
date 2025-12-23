import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type EducationType = 'basics' | 'topics' | 'sleep' | 'boundaries';

interface EducationProgress {
  education_type: EducationType;
  item_id: string;
  completed_at: string;
}

export interface EducationItem {
  id: string;
  type: EducationType;
  titleKey: string;
  descriptionKey: string;
  totalItems: number;
  completedItems: number;
  items: string[];
}

const EDUCATION_ITEMS: Record<EducationType, string[]> = {
  basics: ['what-is', 'emotional', 'resilience', 'connection'],
  topics: ['anxiety', 'depression', 'adhd', 'burnout'],
  sleep: ['sleep-science'],
  boundaries: ['healthy-boundaries'],
};

export function useMindFuelEducationProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<EducationProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('mind_fuel_education_progress')
        .select('education_type, item_id, completed_at')
        .eq('user_id', user.id);

      if (error) throw error;
      setProgress((data || []).map(item => ({
        education_type: item.education_type as EducationType,
        item_id: item.item_id,
        completed_at: item.completed_at,
      })));
    } catch (error) {
      console.error('Error fetching education progress:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const markAsComplete = useCallback(async (educationType: EducationType, itemId: string) => {
    if (!user) return { success: false };

    try {
      const { error } = await supabase
        .from('mind_fuel_education_progress')
        .upsert({
          user_id: user.id,
          education_type: educationType,
          item_id: itemId,
        }, {
          onConflict: 'user_id,education_type,item_id'
        });

      if (error) throw error;
      
      // Optimistically update local state
      setProgress(prev => {
        const exists = prev.some(
          p => p.education_type === educationType && p.item_id === itemId
        );
        if (exists) return prev;
        return [...prev, { education_type: educationType, item_id: itemId, completed_at: new Date().toISOString() }];
      });

      return { success: true };
    } catch (error) {
      console.error('Error marking education as complete:', error);
      return { success: false };
    }
  }, [user]);

  const isItemComplete = useCallback((educationType: EducationType, itemId: string) => {
    return progress.some(
      p => p.education_type === educationType && p.item_id === itemId
    );
  }, [progress]);

  const getCompletedCount = useCallback((educationType: EducationType) => {
    const items = EDUCATION_ITEMS[educationType];
    return items.filter(itemId => isItemComplete(educationType, itemId)).length;
  }, [isItemComplete]);

  const getTotalCount = useCallback((educationType: EducationType) => {
    return EDUCATION_ITEMS[educationType].length;
  }, []);

  const getEducationItems = useCallback((): EducationItem[] => {
    return [
      {
        id: 'basics',
        type: 'basics' as EducationType,
        titleKey: 'mindFuel.dailyChecklist.learningJourney.items.basics.title',
        descriptionKey: 'mindFuel.dailyChecklist.learningJourney.items.basics.description',
        totalItems: getTotalCount('basics'),
        completedItems: getCompletedCount('basics'),
        items: EDUCATION_ITEMS.basics,
      },
      {
        id: 'topics',
        type: 'topics' as EducationType,
        titleKey: 'mindFuel.dailyChecklist.learningJourney.items.topics.title',
        descriptionKey: 'mindFuel.dailyChecklist.learningJourney.items.topics.description',
        totalItems: getTotalCount('topics'),
        completedItems: getCompletedCount('topics'),
        items: EDUCATION_ITEMS.topics,
      },
      {
        id: 'sleep',
        type: 'sleep' as EducationType,
        titleKey: 'mindFuel.dailyChecklist.learningJourney.items.sleep.title',
        descriptionKey: 'mindFuel.dailyChecklist.learningJourney.items.sleep.description',
        totalItems: getTotalCount('sleep'),
        completedItems: getCompletedCount('sleep'),
        items: EDUCATION_ITEMS.sleep,
      },
      {
        id: 'boundaries',
        type: 'boundaries' as EducationType,
        titleKey: 'mindFuel.dailyChecklist.learningJourney.items.boundaries.title',
        descriptionKey: 'mindFuel.dailyChecklist.learningJourney.items.boundaries.description',
        totalItems: getTotalCount('boundaries'),
        completedItems: getCompletedCount('boundaries'),
        items: EDUCATION_ITEMS.boundaries,
      },
    ];
  }, [getCompletedCount, getTotalCount]);

  const totalEducationProgress = useCallback(() => {
    const total = Object.values(EDUCATION_ITEMS).flat().length;
    const completed = progress.length;
    return { completed, total, allComplete: completed >= total };
  }, [progress]);

  return {
    progress,
    loading,
    markAsComplete,
    isItemComplete,
    getCompletedCount,
    getTotalCount,
    getEducationItems,
    totalEducationProgress,
    refetch: fetchProgress,
  };
}
