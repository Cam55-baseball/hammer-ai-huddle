import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Flame, 
  Moon, 
  Sun, 
  Brain, 
  Dumbbell, 
  Salad, 
  CheckCircle2,
  Scale,
  Clock,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { triggerConfetti, stopConfetti } from '@/lib/confetti';
import { cn } from '@/lib/utils';

interface TodayStats {
  checkinsCompleted: number;
  workoutsLogged: number;
  sleepGoalHours: number | null;
  weightTracked: number | null;
}

interface TomorrowPreview {
  hasWorkout: boolean;
  workoutName?: string;
  hasMindFuel: boolean;
  hasNutritionTip: boolean;
}

interface NightCheckInSuccessProps {
  streakDays: number;
  todayStats: TodayStats;
  tomorrowPreview: TomorrowPreview;
  moodLevel: number;
  stressLevel: number;
  sleepGoalTime: string | null;
  daysUntilRecap: number;
  onClose: () => void;
}

export function NightCheckInSuccess({
  streakDays,
  todayStats,
  tomorrowPreview,
  moodLevel,
  stressLevel,
  sleepGoalTime,
  daysUntilRecap,
  onClose,
}: NightCheckInSuccessProps) {
  const { t } = useTranslation();
  const [sleepCountdown, setSleepCountdown] = useState<string | null>(null);

  // Trigger confetti on mount
  useEffect(() => {
    triggerConfetti();
    return () => stopConfetti();
  }, []);

  // Calculate sleep countdown
  useEffect(() => {
    if (!sleepGoalTime) return;

    const updateCountdown = () => {
      const now = new Date();
      const [hours, minutes] = sleepGoalTime.split(':').map(Number);
      const goalTime = new Date();
      goalTime.setHours(hours, minutes, 0, 0);
      
      // If goal time is earlier than now, it's tomorrow
      if (goalTime <= now) {
        goalTime.setDate(goalTime.getDate() + 1);
      }
      
      const diff = goalTime.getTime() - now.getTime();
      const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
      const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hoursLeft > 0) {
        setSleepCountdown(`${hoursLeft}h ${minutesLeft}m`);
      } else {
        setSleepCountdown(`${minutesLeft}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [sleepGoalTime]);

  // Get personalized goodnight message based on mood/stress
  const goodnightMessage = useMemo(() => {
    const highMood = moodLevel >= 4;
    const lowStress = stressLevel <= 2;
    const perfect = highMood && lowStress;
    
    if (perfect && streakDays >= 7) {
      return t('vault.quiz.nightSuccess.goodnightMessages.perfect');
    } else if (highMood && lowStress) {
      return t('vault.quiz.nightSuccess.goodnightMessages.great');
    } else if (stressLevel >= 4) {
      return t('vault.quiz.nightSuccess.goodnightMessages.stressed');
    } else if (moodLevel <= 2) {
      return t('vault.quiz.nightSuccess.goodnightMessages.lowMood');
    } else {
      return t('vault.quiz.nightSuccess.goodnightMessages.great');
    }
  }, [moodLevel, stressLevel, streakDays, t]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className="flex flex-col gap-4 py-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <motion.div 
        variants={itemVariants}
        className="text-center space-y-2"
      >
        <div className="flex items-center justify-center gap-2 text-3xl">
          <Sparkles className="h-8 w-8 text-amber-400 animate-pulse" />
          <span className="font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {t('vault.quiz.nightSuccess.title')}
          </span>
          <Sparkles className="h-8 w-8 text-amber-400 animate-pulse" />
        </div>
        
        {/* Streak Counter */}
        {streakDays > 0 && (
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
          >
            <Flame className="h-5 w-5 text-orange-500 animate-pulse" />
            <span className="font-bold text-orange-500">{streakDays}</span>
            <span className="text-sm text-muted-foreground">{t('vault.quiz.nightSuccess.days')}</span>
          </motion.div>
        )}
      </motion.div>

      {/* Today's Highlights */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {t('vault.quiz.nightSuccess.todayHighlights')}
            </h3>
            
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                </div>
                <span>{t('vault.quiz.nightSuccess.checkinsCompleted', { count: todayStats.checkinsCompleted })}</span>
              </div>
              
              {todayStats.workoutsLogged > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Dumbbell className="h-3.5 w-3.5 text-orange-500" />
                  </div>
                  <span>{t('vault.quiz.nightSuccess.workoutsLogged', { count: todayStats.workoutsLogged })}</span>
                </div>
              )}
              
              {todayStats.sleepGoalHours && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Moon className="h-3.5 w-3.5 text-indigo-500" />
                  </div>
                  <span>{t('vault.quiz.nightSuccess.sleepGoalSet', { hours: todayStats.sleepGoalHours.toFixed(1) })}</span>
                </div>
              )}
              
              {todayStats.weightTracked && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Scale className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <span>{t('vault.quiz.nightSuccess.weightTracked', { weight: todayStats.weightTracked })}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tomorrow Preview */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Sun className="h-4 w-4 text-amber-500" />
              {t('vault.quiz.nightSuccess.tomorrowAwaits')}
            </h3>
            
            <p className="text-xs text-muted-foreground">
              {t('vault.quiz.nightSuccess.tomorrowIncludes')}
            </p>
            
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-base">☀️</span>
                <span>{t('vault.quiz.nightSuccess.morningCheckin')}</span>
              </div>
              
              {tomorrowPreview.hasWorkout && (
                <div className="flex items-center gap-2">
                  <span className="text-base">💪</span>
                  <span>{tomorrowPreview.workoutName || t('vault.quiz.nightSuccess.scheduledWorkout')}</span>
                </div>
              )}
              
              {tomorrowPreview.hasMindFuel && (
                <div className="flex items-center gap-2">
                  <span className="text-base">🧠</span>
                  <span>{t('vault.quiz.nightSuccess.mindFuelLesson')}</span>
                </div>
              )}
              
              {tomorrowPreview.hasNutritionTip && (
                <div className="flex items-center gap-2">
                  <span className="text-base">🥗</span>
                  <span>{t('vault.quiz.nightSuccess.nutritionTip')}</span>
                </div>
              )}
            </div>
            
            {/* Personalized Goodnight Message */}
            <div className="pt-2 border-t border-border/50">
              <p className="text-sm italic text-muted-foreground text-center">
                "{goodnightMessage}"
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Morning Bonus Section */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Sun className="h-4 w-4 text-amber-500" />
              {t('vault.quiz.nightSuccess.morningBonus.title')}
            </h3>
            
            <p className="text-xs text-muted-foreground">
              {t('vault.quiz.nightSuccess.morningBonus.subtitle')}
            </p>
            
            <div className="grid gap-1.5 text-sm">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span>{t('vault.quiz.nightSuccess.morningBonus.keepStreak')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-blue-500" />
                <span>{t('vault.quiz.nightSuccess.morningBonus.trackWeight')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                <span>{t('vault.quiz.nightSuccess.morningBonus.getDailyFocus')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-green-500" />
                <span>{t('vault.quiz.nightSuccess.morningBonus.unlockMotivation')}</span>
              </div>
            </div>
            
            {/* Recap Countdown */}
            {daysUntilRecap > 0 && (
              <div className="pt-2 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{t('vault.quiz.nightSuccess.recapCountdown', { days: daysUntilRecap })}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Sleep Countdown */}
      {sleepCountdown && (
        <motion.div 
          variants={itemVariants}
          className="text-center py-2"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Clock className="h-4 w-4 text-indigo-400" />
            <span className="text-sm">
              {t('vault.quiz.nightSuccess.sleepCountdown', { time: sleepCountdown })}
            </span>
          </div>
        </motion.div>
      )}

      {/* Close Button */}
      <motion.div variants={itemVariants} className="pt-2">
        <Button 
          onClick={onClose}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-6 text-lg"
        >
          <Moon className="h-5 w-5 mr-2" />
          {t('vault.quiz.nightSuccess.closeButton')}
        </Button>
      </motion.div>
    </motion.div>
  );
}
