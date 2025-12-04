import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showBadgeUnlockToast } from '@/components/bounce-back-bay/BadgeUnlockToast';
import { useTranslation } from 'react-i18next';

interface SectionProgressState {
  sectionsCompleted: string[];
  badgesEarned: string[];
  quizzesPassed: string[];
  currentStreak: number;
  longestStreak: number;
}

// Badge unlock criteria
const SECTION_BADGES: Record<string, string> = {
  'red-flags': 'red_flag_ready',
  'pain-scale': 'pain_scale_pro',
  'recovery-methods': 'recovery_intelligence',
};

const INJURY_BADGES: Record<string, string> = {
  'shoulder': 'shoulder_scholar',
  'elbow': 'elbow_expert',
  'hamstring': 'hamstring_headliner',
  'ankle': 'ankle_analyst',
  'wrist': 'wrist_wizard',
  'back': 'back_boss',
};

const TIERED_BADGE_THRESHOLDS = {
  bronze_anatomy: 3,
  silver_anatomy: 5,
  gold_anatomy: 7,
  elite_recovery: 8,
};

export function useSectionProgress(initialState?: Partial<SectionProgressState>) {
  const { t } = useTranslation();
  const [sectionsCompleted, setSectionsCompleted] = useState<string[]>(initialState?.sectionsCompleted || []);
  const [badgesEarned, setBadgesEarned] = useState<string[]>(initialState?.badgesEarned || []);
  const [quizzesPassed, setQuizzesPassed] = useState<string[]>(initialState?.quizzesPassed || []);
  const [currentStreak, setCurrentStreak] = useState(initialState?.currentStreak || 0);
  const [longestStreak, setLongestStreak] = useState(initialState?.longestStreak || 0);

  const checkAndUnlockBadges = useCallback(async (
    newSectionsCompleted: string[],
    newQuizzesPassed: string[],
    currentBadges: string[]
  ): Promise<string[]> => {
    const newBadges: string[] = [];

    // Check section-specific badges
    for (const [section, badge] of Object.entries(SECTION_BADGES)) {
      if (newSectionsCompleted.includes(section) && !currentBadges.includes(badge)) {
        newBadges.push(badge);
      }
    }

    // Check tiered badges based on section count
    const sectionCount = newSectionsCompleted.length;
    for (const [badge, threshold] of Object.entries(TIERED_BADGE_THRESHOLDS)) {
      if (sectionCount >= threshold && !currentBadges.includes(badge)) {
        newBadges.push(badge);
      }
    }

    // Check human_body_mastery - requires all quizzes passed
    const requiredQuizzes = ['diagnostic', 'pain-scale', 'red-flags', 'rtp', 'prevention', 'recovery', 'equipment'];
    const allQuizzesPassed = requiredQuizzes.every(q => newQuizzesPassed.includes(q));
    if (allQuizzesPassed && !currentBadges.includes('human_body_mastery')) {
      newBadges.push('human_body_mastery');
    }

    return newBadges;
  }, []);

  const markSectionComplete = useCallback(async (sectionId: string) => {
    if (sectionsCompleted.includes(sectionId)) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newSectionsCompleted = [...sectionsCompleted, sectionId];
    setSectionsCompleted(newSectionsCompleted);

    // Check for new badges
    const newBadges = await checkAndUnlockBadges(newSectionsCompleted, quizzesPassed, badgesEarned);
    
    let updatedBadges = badgesEarned;
    if (newBadges.length > 0) {
      updatedBadges = [...badgesEarned, ...newBadges];
      setBadgesEarned(updatedBadges);
      
      // Show toast for each new badge
      newBadges.forEach(badge => {
        const badgeName = t(`bounceBackBay.badges.items.${badge}.name`);
        showBadgeUnlockToast({ badgeKey: badge, badgeName });
      });
    }

    // Update database
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existingProgress } = await supabase
      .from('user_injury_progress')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingProgress) {
      await supabase
        .from('user_injury_progress')
        .update({
          sections_completed: newSectionsCompleted,
          badges_earned: updatedBadges,
          total_sections_viewed: newSectionsCompleted.length,
          last_visit_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('user_injury_progress')
        .insert({
          user_id: user.id,
          sections_completed: newSectionsCompleted,
          badges_earned: updatedBadges,
          total_sections_viewed: newSectionsCompleted.length,
          last_visit_date: today,
          current_streak: 1,
          longest_streak: 1,
        });
    }
  }, [sectionsCompleted, badgesEarned, quizzesPassed, checkAndUnlockBadges, t]);

  const markQuizPassed = useCallback(async (quizId: string) => {
    if (quizzesPassed.includes(quizId)) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newQuizzesPassed = [...quizzesPassed, quizId];
    setQuizzesPassed(newQuizzesPassed);

    // Check for new badges
    const newBadges = await checkAndUnlockBadges(sectionsCompleted, newQuizzesPassed, badgesEarned);
    
    let updatedBadges = badgesEarned;
    if (newBadges.length > 0) {
      updatedBadges = [...badgesEarned, ...newBadges];
      setBadgesEarned(updatedBadges);
      
      // Show toast for each new badge
      newBadges.forEach(badge => {
        const badgeName = t(`bounceBackBay.badges.items.${badge}.name`);
        showBadgeUnlockToast({ badgeKey: badge, badgeName });
      });
    }

    // Update database
    await supabase
      .from('user_injury_progress')
      .update({
        quizzes_passed: newQuizzesPassed,
        badges_earned: updatedBadges,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
  }, [quizzesPassed, sectionsCompleted, badgesEarned, checkAndUnlockBadges, t]);

  const loadProgress = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_injury_progress')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setSectionsCompleted(data.sections_completed || []);
      setBadgesEarned(data.badges_earned || []);
      setQuizzesPassed((data as any).quizzes_passed || []);
      setCurrentStreak(data.current_streak || 0);
      setLongestStreak(data.longest_streak || 0);
    }
  }, []);

  return {
    sectionsCompleted,
    badgesEarned,
    quizzesPassed,
    currentStreak,
    longestStreak,
    markSectionComplete,
    markQuizPassed,
    loadProgress,
    setSectionsCompleted,
    setBadgesEarned,
    setQuizzesPassed,
    setCurrentStreak,
    setLongestStreak,
  };
}
