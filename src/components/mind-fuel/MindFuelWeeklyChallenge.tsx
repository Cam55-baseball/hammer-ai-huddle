import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showBadgeUnlockToast } from './MindFuelBadgeUnlockToast';
import { 
  Target, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  Sparkles,
  Trophy,
  Flame,
  Timer
} from 'lucide-react';

// Category-specific colors for badges
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  mental_mastery: { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/30' },
  emotional_balance: { bg: 'bg-sky-500/20', text: 'text-red-400', border: 'border-sky-500/30' },
  leadership: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
  life_mastery: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
};

interface ChallengeData {
  id: string;
  challenge_id: string;
  status: string;
  days_completed: number;
  total_days: number;
  started_at: string;
  completed_at: string | null;
  last_checkin_at: string | null;
}

interface ChallengeDefinition {
  id: string;
  category: string;
  totalDays: number;
}

interface WeeklyChallengeResponse {
  currentChallenge: (ChallengeData & { definition: ChallengeDefinition }) | null;
  availableChallenge: ChallengeDefinition | null;
  daysRemainingInWeek: number;
  completedChallengesCount: number;
  history: ChallengeData[];
  newBadges?: string[];
  cooldownActive?: boolean;
  cooldownEndsAt?: string | null;
}

// Challenge complete confetti animation
function triggerChallengeCompleteConfetti() {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    overflow: hidden;
  `;
  document.body.appendChild(container);

  // Amber/orange/red themed colors for challenge completion
  const colors = ['#f59e0b', '#f97316', '#ef4444', '#eab308', '#fb923c', '#fbbf24'];
  const particleCount = 80;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 12 + 6;
    const left = Math.random() * 100;
    const animationDuration = Math.random() * 2.5 + 2;
    const delay = Math.random() * 0.8;
    const rotation = Math.random() * 1080;

    particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      left: ${left}%;
      top: -20px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation: challenge-confetti-fall ${animationDuration}s ease-out ${delay}s forwards;
      transform: rotate(${rotation}deg);
    `;

    container.appendChild(particle);
  }

  // Add animation keyframes if not exists
  if (!document.getElementById('challenge-confetti-styles')) {
    const style = document.createElement('style');
    style.id = 'challenge-confetti-styles';
    style.textContent = `
      @keyframes challenge-confetti-fall {
        0% {
          transform: translateY(0) rotate(0deg) scale(1);
          opacity: 1;
        }
        50% {
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(1080deg) scale(0.5);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Haptic feedback
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100, 50, 200]);
  }

  // Clean up
  setTimeout(() => {
    container.remove();
  }, 5000);
}

// Format cooldown time remaining
function formatCooldownTime(endsAt: string): string {
  const remaining = new Date(endsAt).getTime() - Date.now();
  if (remaining <= 0) return '';
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default function MindFuelWeeklyChallenge() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckinLoading, setIsCheckinLoading] = useState(false);
  const [data, setData] = useState<WeeklyChallengeResponse | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<string | null>(null);

  const fetchChallenge = useCallback(async () => {
    try {
      const { data: result, error } = await supabase.functions.invoke('get-weekly-challenge', {
        body: {},
      });

      if (error) throw error;
      setData(result);
    } catch (error) {
      console.error('Error fetching challenge:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  // Cooldown countdown timer
  useEffect(() => {
    if (!data?.cooldownEndsAt) {
      setCooldownRemaining(null);
      return;
    }

    const updateCooldown = () => {
      const endsAt = new Date(data.cooldownEndsAt!);
      const remaining = endsAt.getTime() - Date.now();
      
      if (remaining <= 0) {
        setCooldownRemaining(null);
        // Refresh data when cooldown expires
        fetchChallenge();
      } else {
        setCooldownRemaining(formatCooldownTime(data.cooldownEndsAt!));
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [data?.cooldownEndsAt, fetchChallenge]);

  const handleStartChallenge = async () => {
    setIsCheckinLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('get-weekly-challenge', {
        body: { action: 'start' },
      });

      if (error) throw error;
      setData(result);
      toast.success(t('mindFuel.weeklyChallenge.started', 'Challenge started! Good luck!'));
    } catch (error) {
      console.error('Error starting challenge:', error);
      toast.error(t('mindFuel.weeklyChallenge.error', 'Failed to start challenge'));
    } finally {
      setIsCheckinLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setIsCheckinLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('get-weekly-challenge', {
        body: { action: 'check_in' },
      });

      if (error) throw error;
      setData(result);
      
      // Check if cooldown is now active (user tried to check in too soon)
      if (result.cooldownActive && result.cooldownEndsAt) {
        toast.error(t('mindFuel.weeklyChallenge.cooldownActive', 'Please wait before checking in again'));
        return;
      }
      
      if (result.currentChallenge?.status === 'completed') {
        // Trigger confetti celebration
        triggerChallengeCompleteConfetti();
        toast.success(t('mindFuel.weeklyChallenge.completed', 'Challenge completed! 🎉'));
        
        // Show badge unlock toasts with staggered delay
        if (result.newBadges && result.newBadges.length > 0) {
          result.newBadges.forEach((badgeKey: string, index: number) => {
            setTimeout(() => {
              showBadgeUnlockToast({ badgeKey });
            }, 1000 + index * 1500);
          });
        }
      } else {
        toast.success(t('mindFuel.weeklyChallenge.checkedIn', 'Day checked in!'));
      }
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error(t('mindFuel.weeklyChallenge.error', 'Failed to check in'));
    } finally {
      setIsCheckinLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 border-amber-500/20">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const currentChallenge = data?.currentChallenge;
  const availableChallenge = data?.availableChallenge;
  const challengeId = currentChallenge?.challenge_id || availableChallenge?.id;
  const isCompleted = currentChallenge?.status === 'completed';
  const progressPercent = currentChallenge 
    ? Math.round((currentChallenge.days_completed / currentChallenge.total_days) * 100)
    : 0;
  const isCooldownActive = !!cooldownRemaining;

  return (
    <Card className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 border-amber-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-amber-500" />
          {t('mindFuel.weeklyChallenge.title', 'Weekly Challenge')}
          {data && (
            <Badge variant="secondary" className="ml-2">
              {data.completedChallengesCount} {t('mindFuel.weeklyChallenge.completed_short', 'completed')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current/Available Challenge Display */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
          <div className="flex items-start justify-between mb-3">
            <div>
            {(() => {
                const category = currentChallenge?.definition?.category || availableChallenge?.category || 'mental_mastery';
                const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.mental_mastery;
                return (
                  <Badge className={`${colors.bg} ${colors.text} ${colors.border} mb-2`}>
                    {t(`weeklyChallenge.categories.${category}`, category)}
                  </Badge>
                );
              })()}
              <h3 className="font-semibold text-foreground">
                {t(`weeklyChallenge.challenges.${challengeId}.title`, challengeId?.replace('_', ' '))}
              </h3>
            </div>
            {isCompleted && (
              <div className="p-2 rounded-full bg-green-500/20">
                <Trophy className="h-5 w-5 text-green-400" />
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            {t(`weeklyChallenge.challenges.${challengeId}.description`, 
               'Complete this challenge to earn badges!')}
          </p>

          {currentChallenge && !isCompleted && (
            <>
              {/* Progress dots */}
              <div className="flex items-center gap-1.5 mb-3">
                {Array.from({ length: currentChallenge.total_days }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-3 w-3 rounded-full transition-all ${
                      i < currentChallenge.days_completed
                        ? 'bg-amber-500'
                        : 'bg-muted/50'
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  {t('mindFuel.weeklyChallenge.dayProgress', 'Day {{current}} of {{total}}', {
                    current: currentChallenge.days_completed,
                    total: currentChallenge.total_days,
                  })}
                </span>
              </div>

              {/* Progress bar */}
              <Progress value={progressPercent} className="h-2 mb-4" />

              {/* Check-in button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {t('mindFuel.weeklyChallenge.daysRemaining', '{{count}} days remaining', {
                    count: data?.daysRemainingInWeek || 0,
                  })}
                </div>
                <Button
                  onClick={handleCheckIn}
                  disabled={isCheckinLoading || isCooldownActive}
                  size="sm"
                  className={isCooldownActive 
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500"
                  }
                >
                  {isCooldownActive ? (
                    <>
                      <Timer className="h-4 w-4 mr-2" />
                      {t('mindFuel.weeklyChallenge.nextCheckIn', 'Next in {{time}}', { time: cooldownRemaining })}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {t('mindFuel.weeklyChallenge.checkIn', 'Check In Today')}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {isCompleted && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <Sparkles className="h-5 w-5 text-green-400" />
              <span className="text-sm text-green-400 font-medium">
                {t('mindFuel.weeklyChallenge.challengeCompleted', 'Challenge completed! Great job!')}
              </span>
            </div>
          )}

          {!currentChallenge && availableChallenge && (
            <Button
              onClick={handleStartChallenge}
              disabled={isCheckinLoading}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500"
            >
              <Flame className="h-4 w-4 mr-2" />
              {t('mindFuel.weeklyChallenge.startChallenge', 'Start This Week\'s Challenge')}
            </Button>
          )}
        </div>

        {/* Challenge History */}
        {data?.history && data.history.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  {t('mindFuel.weeklyChallenge.history', 'Challenge History')}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {data.history.slice(0, 5).map((challenge) => (
                <div
                  key={challenge.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div>
                    <span className="text-sm font-medium">
                      {t(`weeklyChallenge.challenges.${challenge.challenge_id}.title`, 
                         challenge.challenge_id.replace('_', ' '))}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      {challenge.days_completed}/{challenge.total_days} {t('mindFuel.weeklyChallenge.days', 'days')}
                    </div>
                  </div>
                  <Badge
                    variant={challenge.status === 'completed' ? 'default' : 'secondary'}
                    className={challenge.status === 'completed' ? 'bg-green-500/20 text-green-400' : ''}
                  >
                    {challenge.status === 'completed' 
                      ? t('mindFuel.weeklyChallenge.completedBadge', 'Completed')
                      : t('mindFuel.weeklyChallenge.incompleteBadge', 'Incomplete')}
                  </Badge>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
