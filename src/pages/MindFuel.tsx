import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import MindFuelStreakCard from '@/components/mind-fuel/MindFuelStreakCard';
import MindFuelBadges from '@/components/mind-fuel/MindFuelBadges';
import DailyLessonHero from '@/components/mind-fuel/DailyLessonHero';
import MindFuelStandards from '@/components/mind-fuel/MindFuelStandards';
import MindFuelCategories from '@/components/mind-fuel/MindFuelCategories';
import MindFuelWeeklyChallenge from '@/components/mind-fuel/MindFuelWeeklyChallenge';
import { showBadgeUnlockToast } from '@/components/mind-fuel/MindFuelBadgeUnlockToast';
import WellnessHubNav, { WellnessModule } from '@/components/mind-fuel/wellness-hub/WellnessHubNav';
import CrisisResourcesCard from '@/components/mind-fuel/crisis-support/CrisisResourcesCard';
import JournalHome from '@/components/mind-fuel/mental-health-journal/JournalHome';
import WellnessDisclaimer from '@/components/mind-fuel/shared/WellnessDisclaimer';
import EmotionalAwarenessHome from '@/components/mind-fuel/emotional-awareness/EmotionalAwarenessHome';
import StressManagementHome from '@/components/mind-fuel/stress-management/StressManagementHome';
import MindfulnessHome from '@/components/mind-fuel/mindfulness/MindfulnessHome';
import { Loader2 } from 'lucide-react';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalVisits: number;
  lessonsCollected: number;
  badgesEarned: string[];
  categoriesExplored: Record<string, number>;
}

interface LessonData {
  id: string;
  category: string;
  subcategory: string;
  content_type: string;
  lesson_text: string;
  author: string | null;
  sport: string;
  is_ai_generated: boolean;
}

interface StatsData {
  totalLessons: number;
  viewedLessons: number;
  lessonsRemainingToday: number;
  dailyLimit: number;
}

export default function MindFuel() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [currentLesson, setCurrentLesson] = useState<LessonData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [currentSport, setCurrentSport] = useState<string>('both');
  const [activeWellnessModule, setActiveWellnessModule] = useState<WellnessModule>('emotional-awareness');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Detect sport from localStorage or subscribed modules
    const savedSport = localStorage.getItem('selectedSport');
    if (savedSport && ['baseball', 'softball'].includes(savedSport)) {
      setCurrentSport(savedSport);
    }
  }, []);

  const fetchDailyLesson = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-daily-lesson', {
        body: { sport: currentSport },
      });

      if (error) throw error;

      if (data) {
        setStreakData(data.streak);
        setCurrentLesson(data.lesson);
        setStats(data.stats);

        // Show badge unlock toasts for new badges
        if (data.newBadges && data.newBadges.length > 0) {
          data.newBadges.forEach((badgeId: string) => {
            showBadgeUnlockToast({ badgeKey: badgeId });
          });
        }
      }
    } catch (error) {
      console.error('Error fetching daily lesson:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentSport]);

  useEffect(() => {
    if (user) {
      fetchDailyLesson();
    }
  }, [user, fetchDailyLesson]);

  const handleGetNewLesson = async () => {
    await fetchDailyLesson();
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 pb-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-6 sm:p-8 text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🔥</span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {t('mindFuel.title', 'Mind Fuel')}
              </h1>
            </div>
            <p className="text-white/80 text-sm sm:text-base max-w-2xl">
              {t('mindFuel.subtitle', 'Build a selfless, limitless, disciplined leader. One daily dose of mental mastery at a time.')}
            </p>
          </div>
        </div>

        {/* Wellness Hub Navigation */}
        <WellnessHubNav 
          activeModule={activeWellnessModule} 
          onModuleChange={setActiveWellnessModule} 
        />

        {/* Wellness Module Content */}
        {activeWellnessModule === 'crisis' ? (
          <CrisisResourcesCard />
        ) : activeWellnessModule === 'journal' ? (
          <JournalHome />
        ) : activeWellnessModule === 'emotional-awareness' ? (
          <EmotionalAwarenessHome />
        ) : activeWellnessModule === 'stress-management' ? (
          <StressManagementHome />
        ) : activeWellnessModule === 'mindfulness' ? (
          <MindfulnessHome />
        ) : (
          <>
            {/* Default Mind Fuel Content */}
            <MindFuelStreakCard
              streak={streakData}
              stats={stats}
              isLoading={isLoading}
            />

            <DailyLessonHero
              lesson={currentLesson}
              stats={stats}
              isLoading={isLoading}
              onGetNewLesson={handleGetNewLesson}
            />

            <MindFuelWeeklyChallenge />
            <MindFuelStandards />

            <MindFuelBadges
              earnedBadges={streakData?.badgesEarned || []}
              currentStreak={streakData?.currentStreak || 0}
              categoriesExplored={streakData?.categoriesExplored || {}}
            />

            <MindFuelCategories
              categoriesExplored={streakData?.categoriesExplored || {}}
            />
          </>
        )}

        {/* Disclaimer */}
        <WellnessDisclaimer />
      </div>
    </DashboardLayout>
  );
}
