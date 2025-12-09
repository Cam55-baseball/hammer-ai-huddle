import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb, RefreshCw, Sparkles, Clock, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useVault } from '@/hooks/useVault';
import { toast } from 'sonner';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalVisits: number;
  tipsCollected: number;
  badgesEarned: string[];
}

interface DailyTipHeroProps {
  sport: 'baseball' | 'softball';
  onStreakUpdate?: (data: {
    streak: StreakData | null;
    totalTips: number;
    viewedTips: number;
  }) => void;
}

interface TipData {
  id: string;
  category: string;
  tip_text: string;
  is_ai_generated: boolean;
}

export function DailyTipHero({ sport, onStreakUpdate }: DailyTipHeroProps) {
  const { t } = useTranslation();
  const { saveTip, savedTips } = useVault();
  const [tip, setTip] = useState<TipData | null>(null);
  const [categoryName, setCategoryName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewedPercentage, setViewedPercentage] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [limitMessage, setLimitMessage] = useState('');
  const [dailyTipsRemaining, setDailyTipsRemaining] = useState(2);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check if current tip is already saved
  useEffect(() => {
    if (tip && savedTips) {
      const alreadySaved = savedTips.some(t => 
        t.tip_text === tip.tip_text && 
        t.module_origin === 'nutrition'
      );
      setIsSaved(alreadySaved);
    } else {
      setIsSaved(false);
    }
  }, [tip, savedTips]);

  const handleSaveTip = async () => {
    if (!tip || saving) return;
    setSaving(true);
    
    const result = await saveTip({
      tip_text: tip.tip_text,
      tip_category: categoryName || tip.category,
      module_origin: 'nutrition',
    });
    
    setSaving(false);
    
    if (result.success) {
      setIsSaved(true);
      toast.success(t('nutrition.tipSavedSuccess'));
    } else if (result.error === 'already_saved') {
      setIsSaved(true);
      toast.info(t('vault.drills.alreadySaved'));
    } else {
      toast.error(result.error || t('common.error'));
    }
  };

  const fetchTip = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('get-daily-tip', {
        body: { sport }
      });

      if (error) throw error;

      // Handle limit reached state
      if (data?.limitReached) {
        setLimitReached(true);
        setLimitMessage(data.limitMessage || t('nutrition.dailyLimitMessage'));
        setDailyTipsRemaining(0);
        setViewedPercentage(data.viewedPercentage || 0);
      } else if (data?.tip) {
        setTip(data.tip);
        setCategoryName(data.categoryName || '');
        setViewedPercentage(data.viewedPercentage || 0);
        setLimitReached(false);
        setDailyTipsRemaining(data.dailyTipsRemaining ?? 1);
        setIsSaved(false); // Reset saved state for new tip
      }

      // Pass streak data to parent
      if (onStreakUpdate) {
        onStreakUpdate({
          streak: data?.streak || null,
          totalTips: data?.totalTips || 0,
          viewedTips: data?.viewedTips || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching daily tip:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTip();
  }, [sport]);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/30">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Limit reached state
  if (limitReached) {
    return (
      <Card className="bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-background border-amber-500/30 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent" />
        <CardContent className="p-4 sm:p-6 relative">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-full bg-amber-500/20 text-amber-500 flex-shrink-0">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className="font-semibold text-foreground text-sm sm:text-base">{t('nutrition.dailyLimitReached')}</h3>
                <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  {t('nutrition.noTipsRemaining')}
                </Badge>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed break-words">
                {limitMessage}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                <span className="text-xs text-muted-foreground">
                  {t('nutrition.percentExplored', { percent: viewedPercentage })}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled
                  className="gap-1 h-7 px-2 opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span className="hidden xs:inline">{t('nutrition.newTip')}</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tip) return null;

  return (
    <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/30 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      <CardContent className="p-4 sm:p-6 relative">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 rounded-full bg-primary/20 text-primary flex-shrink-0">
            <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">{t('nutrition.dailyTip')}</h3>
              {categoryName && (
                <Badge variant="secondary" className="text-xs">
                  {categoryName}
                </Badge>
              )}
              {tip.is_ai_generated && (
                <Badge variant="outline" className="text-xs gap-1 border-purple-500/50 text-purple-400">
                  <Sparkles className="h-3 w-3" />
                  {t('common.ai')}
                </Badge>
              )}
              {dailyTipsRemaining >= 0 && (
                <Badge variant="outline" className="text-xs">
                  {dailyTipsRemaining === 1 
                    ? t('nutrition.tipLeftToday', { count: dailyTipsRemaining })
                    : t('nutrition.tipsLeftToday', { count: dailyTipsRemaining })}
                </Badge>
              )}
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed break-words">
              {tip.tip_text}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
              <span className="text-xs text-muted-foreground">
                {t('nutrition.percentExplored', { percent: viewedPercentage })}
              </span>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSaveTip}
                  disabled={isSaved || saving}
                  className={`gap-1 h-7 px-2 ${isSaved ? 'text-red-500' : ''}`}
                >
                  <Heart className={`h-3 w-3 ${isSaved ? 'fill-current' : ''}`} />
                  <span className="hidden xs:inline">
                    {isSaved ? t('nutrition.tipSaved') : t('nutrition.saveTip')}
                  </span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => fetchTip(true)}
                  disabled={refreshing || dailyTipsRemaining <= 0}
                  className="gap-1 h-7 px-2"
                >
                  <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden xs:inline">{t('nutrition.newTip')}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
