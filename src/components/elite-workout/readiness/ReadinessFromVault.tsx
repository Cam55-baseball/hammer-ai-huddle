import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, RefreshCw, Moon, Zap, Activity, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ReadinessRecommendation = 'full_send' | 'modify_volume' | 'recovery_focus';

interface VaultCheckinData {
  sleep_quality: number | null;
  physical_readiness: number | null;
  perceived_recovery: number | null;
  pain_location: string[] | null;
  pain_scales: Record<string, number> | null;
  entry_date: string;
  created_at: string;
}

interface ReadinessResult {
  score: number;
  recommendation: ReadinessRecommendation;
  checkin: VaultCheckinData | null;
  loading: boolean;
  error: string | null;
}

interface ReadinessFromVaultProps {
  userId?: string;
  onReadinessChange?: (result: ReadinessResult) => void;
  compact?: boolean;
  className?: string;
}

function calculateReadinessScore(checkin: VaultCheckinData | null): number {
  if (!checkin) return 100; // No data = assume good to go
  
  let score = 0;
  let factors = 0;
  
  // Sleep quality (1-5 scale, convert to 0-100)
  if (checkin.sleep_quality) {
    score += (checkin.sleep_quality / 5) * 100;
    factors++;
  }
  
  // Physical readiness (1-5 scale)
  if (checkin.physical_readiness) {
    score += (checkin.physical_readiness / 5) * 100;
    factors++;
  }
  
  // Perceived recovery (1-5 scale)
  if (checkin.perceived_recovery) {
    score += (checkin.perceived_recovery / 5) * 100;
    factors++;
  }
  
  // Pain deduction - average pain across all areas
  if (checkin.pain_scales && Object.keys(checkin.pain_scales).length > 0) {
    const painValues = Object.values(checkin.pain_scales);
    const avgPain = painValues.reduce((a, b) => a + b, 0) / painValues.length;
    const painPenalty = (avgPain / 10) * 30; // Max 30 point penalty for avg pain of 10
    score -= painPenalty;
  }
  
  if (factors === 0) return 100;
  return Math.max(0, Math.min(100, Math.round(score / factors)));
}

function getReadinessRecommendation(score: number): ReadinessRecommendation {
  if (score >= 75) return 'full_send';
  if (score >= 50) return 'modify_volume';
  return 'recovery_focus';
}

export function ReadinessFromVault({ 
  userId, 
  onReadinessChange, 
  compact = false,
  className 
}: ReadinessFromVaultProps) {
  const { t } = useTranslation();
  const [result, setResult] = useState<ReadinessResult>({
    score: 100,
    recommendation: 'full_send',
    checkin: null,
    loading: true,
    error: null
  });

  const fetchLatestCheckin = async () => {
    if (!userId) {
      setResult(prev => ({ ...prev, loading: false }));
      return;
    }

    setResult(prev => ({ ...prev, loading: true, error: null }));

    try {
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('vault_focus_quizzes')
        .select('sleep_quality, physical_readiness, perceived_recovery, pain_location, pain_scales, entry_date, created_at')
        .eq('user_id', userId)
        .gte('entry_date', yesterday)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const checkin = data as VaultCheckinData | null;
      const score = calculateReadinessScore(checkin);
      const recommendation = getReadinessRecommendation(score);

      const newResult: ReadinessResult = {
        score,
        recommendation,
        checkin,
        loading: false,
        error: null
      };

      setResult(newResult);
      onReadinessChange?.(newResult);
    } catch (err) {
      console.error('Error fetching vault checkin:', err);
      setResult(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch readiness data'
      }));
    }
  };

  useEffect(() => {
    fetchLatestCheckin();
  }, [userId]);

  const getRecommendationConfig = (rec: ReadinessRecommendation) => {
    switch (rec) {
      case 'full_send':
        return {
          icon: CheckCircle,
          label: t('eliteWorkout.readiness.fullSend', 'Full Send!'),
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30'
        };
      case 'modify_volume':
        return {
          icon: AlertTriangle,
          label: t('eliteWorkout.readiness.modifyVolume', 'Modify Volume'),
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30'
        };
      case 'recovery_focus':
        return {
          icon: TrendingDown,
          label: t('eliteWorkout.readiness.recoveryFocus', 'Recovery Focus'),
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30'
        };
    }
  };

  const config = getRecommendationConfig(result.recommendation);
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {result.loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            <Badge variant="outline" className={cn('gap-1', config.bgColor, config.borderColor)}>
              <Icon className={cn('h-3 w-3', config.color)} />
              <span className={config.color}>{result.score}%</span>
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={fetchLatestCheckin}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('border-2', config.borderColor, className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t('eliteWorkout.readiness.title', 'Quick Readiness Check')}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLatestCheckin}
            disabled={result.loading}
            className="h-8 gap-1"
          >
            <RefreshCw className={cn('h-3 w-3', result.loading && 'animate-spin')} />
            {t('eliteWorkout.readiness.fromVault', 'From Vault')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Score Display */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('eliteWorkout.readiness.score', 'Readiness Score')}
                </span>
                <span className={cn('text-2xl font-black', config.color)}>
                  {result.score}%
                </span>
              </div>
              <Progress 
                value={result.score} 
                className={cn('h-2', config.bgColor)}
              />
            </div>

            {/* Recommendation Badge */}
            <div className={cn('p-3 rounded-lg flex items-center gap-3', config.bgColor)}>
              <Icon className={cn('h-5 w-5', config.color)} />
              <div>
                <p className={cn('font-bold', config.color)}>{config.label}</p>
                <p className="text-xs text-muted-foreground">
                  {t('eliteWorkout.readiness.recommendation', 'Recommendation')}
                </p>
              </div>
            </div>

            {/* Checkin Details */}
            {result.checkin && (
              <div className="grid grid-cols-3 gap-2 text-center">
                {result.checkin.sleep_quality && (
                  <div className="p-2 rounded-lg bg-muted/50">
                    <Moon className="h-4 w-4 mx-auto mb-1 text-indigo-500" />
                    <p className="text-xs text-muted-foreground">{t('eliteWorkout.readiness.sleep', 'Sleep')}</p>
                    <p className="font-bold">{result.checkin.sleep_quality}/5</p>
                  </div>
                )}
                {result.checkin.physical_readiness && (
                  <div className="p-2 rounded-lg bg-muted/50">
                    <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
                    <p className="text-xs text-muted-foreground">{t('eliteWorkout.readiness.energy', 'Energy')}</p>
                    <p className="font-bold">{result.checkin.physical_readiness}/5</p>
                  </div>
                )}
                {result.checkin.perceived_recovery && (
                  <div className="p-2 rounded-lg bg-muted/50">
                    <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
                    <p className="text-xs text-muted-foreground">{t('eliteWorkout.readiness.soreness', 'Recovery')}</p>
                    <p className="font-bold">{result.checkin.perceived_recovery}/5</p>
                  </div>
                )}
              </div>
            )}

            {/* Last Check-in Time */}
            {result.checkin?.created_at && (
              <p className="text-xs text-muted-foreground text-center">
                {t('eliteWorkout.readiness.lastCheckin', 'Last check-in')}: {format(new Date(result.checkin.created_at), 'MMM d, h:mm a')}
              </p>
            )}

            {!result.checkin && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No recent Vault check-in found. Complete a check-in for personalized recommendations.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export { calculateReadinessScore, getReadinessRecommendation };
