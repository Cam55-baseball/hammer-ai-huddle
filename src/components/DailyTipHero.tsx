import { useState, useEffect } from 'react';
import { Lightbulb, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

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
  const [tip, setTip] = useState<TipData | null>(null);
  const [categoryName, setCategoryName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewedPercentage, setViewedPercentage] = useState(0);

  const fetchTip = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('get-daily-tip', {
        body: { sport }
      });

      if (error) throw error;

      if (data?.tip) {
        setTip(data.tip);
        setCategoryName(data.categoryName || '');
        setViewedPercentage(data.viewedPercentage || 0);
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
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Daily Tip</h3>
              {categoryName && (
                <Badge variant="secondary" className="text-xs">
                  {categoryName}
                </Badge>
              )}
              {tip.is_ai_generated && (
                <Badge variant="outline" className="text-xs gap-1 border-purple-500/50 text-purple-400">
                  <Sparkles className="h-3 w-3" />
                  AI
                </Badge>
              )}
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed break-words">
              {tip.tip_text}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
              <span className="text-xs text-muted-foreground">
                {viewedPercentage}% of tips explored
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => fetchTip(true)}
                disabled={refreshing}
                className="gap-1 h-7 px-2"
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline">New Tip</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
