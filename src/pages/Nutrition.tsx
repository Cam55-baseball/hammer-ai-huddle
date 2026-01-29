import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Apple, ArrowLeft, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NutritionDisclaimer } from '@/components/NutritionDisclaimer';
import { DailyTipHero } from '@/components/DailyTipHero';
import { NutritionCategory } from '@/components/NutritionCategory';
import { TodaysTipsReview } from '@/components/TodaysTipsReview';
import { NutritionStreakCard } from '@/components/NutritionStreakCard';
import { NutritionBadges } from '@/components/NutritionBadges';
import EatingDisorderEducation from '@/components/nutrition/EatingDisorderEducation';
import BodyImageEducation from '@/components/nutrition/BodyImageEducation';
import { useAuth } from '@/hooks/useAuth';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalVisits: number;
  tipsCollected: number;
  badgesEarned: string[];
}

export default function Nutrition() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  
  const [currentSport, setCurrentSport] = useState<'baseball' | 'softball'>(() => {
    const saved = localStorage.getItem('selectedSport');
    return (saved === 'baseball' || saved === 'softball') ? saved : 'baseball';
  });

  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [totalTips, setTotalTips] = useState(0);
  const [viewedTips, setViewedTips] = useState(0);
  const [streakLoading, setStreakLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Scroll to anchor if hash is present (for Game Plan navigation)
  useEffect(() => {
    if (location.hash === '#daily-tip') {
      const scrollToTip = () => {
        const element = document.getElementById('daily-tip');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
      
      // Multiple scroll attempts to handle async content loading
      const timer1 = setTimeout(scrollToTip, 100);
      const timer2 = setTimeout(scrollToTip, 500);
      const timer3 = setTimeout(scrollToTip, 1000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [location.hash]);

  // Callback to receive streak data from DailyTipHero
  const handleStreakUpdate = (data: {
    streak: StreakData | null;
    totalTips: number;
    viewedTips: number;
  }) => {
    setStreakData(data.streak);
    setTotalTips(data.totalTips);
    setViewedTips(data.viewedTips);
    setStreakLoading(false);
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/dashboard')}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-400">
              <Apple className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{t('nutrition.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('nutrition.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Streak Card */}
        <NutritionStreakCard 
          streak={streakData}
          totalTips={totalTips}
          viewedTips={viewedTips}
          isLoading={streakLoading}
        />

        {/* Badges */}
        <NutritionBadges 
          earnedBadges={streakData?.badgesEarned || []}
          currentStreak={streakData?.currentStreak || 0}
        />

        {/* Daily Tip */}
        <div id="daily-tip">
          <DailyTipHero sport={currentSport} onStreakUpdate={handleStreakUpdate} />
        </div>

        {/* Today's Tips Review */}
        <TodaysTipsReview />

        {/* Categories */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>{t('nutrition.categoriesTitle')}</span>
            <span className="text-xs text-muted-foreground font-normal">{t('nutrition.topicsCount', { count: 18 })}</span>
          </h2>
          <NutritionCategory />
        </div>

        {/* Athlete Wellness Education */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-teal-400" />
            <span>{t('nutrition.education.sectionTitle', 'Athlete Wellness Education')}</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('nutrition.education.sectionSubtitle', 'Important information for your health and well-being')}
          </p>
          <div className="space-y-4">
            <EatingDisorderEducation />
            <BodyImageEducation />
          </div>
        </div>

        {/* Disclaimer at bottom */}
        <NutritionDisclaimer />
      </div>
    </DashboardLayout>
  );
}
