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
import { 
  Target, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  Sparkles,
  Trophy,
  Flame
} from 'lucide-react';

interface ChallengeData {
  id: string;
  challenge_id: string;
  status: string;
  days_completed: number;
  total_days: number;
  started_at: string;
  completed_at: string | null;
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
}

export default function MindFuelWeeklyChallenge() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckinLoading, setIsCheckinLoading] = useState(false);
  const [data, setData] = useState<WeeklyChallengeResponse | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

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
      
      if (result.currentChallenge?.status === 'completed') {
        toast.success(t('mindFuel.weeklyChallenge.completed', 'Challenge completed! 🎉'));
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
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 mb-2">
                {t(`mindFuel.weeklyChallenge.categories.${currentChallenge?.definition?.category || availableChallenge?.category}`, 
                   currentChallenge?.definition?.category || availableChallenge?.category)}
              </Badge>
              <h3 className="font-semibold text-foreground">
                {t(`mindFuel.weeklyChallenge.challenges.${challengeId}.title`, challengeId?.replace('_', ' '))}
              </h3>
            </div>
            {isCompleted && (
              <div className="p-2 rounded-full bg-green-500/20">
                <Trophy className="h-5 w-5 text-green-400" />
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            {t(`mindFuel.weeklyChallenge.challenges.${challengeId}.description`, 
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
                  disabled={isCheckinLoading}
                  size="sm"
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t('mindFuel.weeklyChallenge.checkIn', 'Check In Today')}
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
                      {t(`mindFuel.weeklyChallenge.challenges.${challenge.challenge_id}.title`, 
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
