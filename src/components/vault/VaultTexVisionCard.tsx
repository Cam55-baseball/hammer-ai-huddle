import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Eye, 
  ChevronDown, 
  Flame, 
  Brain, 
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface VaultTexVisionCardProps {
  isLoading?: boolean;
}

interface TexVisionData {
  progress: {
    current_tier: string;
    streak_current: number;
    streak_longest: number;
    total_sessions_completed: number;
  } | null;
  metrics: {
    neuro_reaction_index: number | null;
    visual_processing_speed: number | null;
    anticipation_quotient: number | null;
    coordination_efficiency: number | null;
    stress_resilience_score: number | null;
  } | null;
  latestDiagnostic: {
    overall_score: number | null;
    test_date: string;
  } | null;
  unlocks: string[];
}

export const VaultTexVisionCard = ({ isLoading = false }: VaultTexVisionCardProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<TexVisionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const sport = localStorage.getItem('selectedSport') || 'baseball';

        const [progressRes, metricsRes, diagnosticRes, unlocksRes] = await Promise.all([
          supabase
            .from('tex_vision_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('sport', sport)
            .maybeSingle(),
          supabase
            .from('tex_vision_metrics')
            .select('*')
            .eq('user_id', user.id)
            .eq('sport', sport)
            .maybeSingle(),
          supabase
            .from('tex_vision_s2_diagnostics')
            .select('overall_score, test_date')
            .eq('user_id', user.id)
            .eq('sport', sport)
            .order('test_date', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('tex_vision_unlocks')
            .select('unlock_type')
            .eq('user_id', user.id)
            .eq('sport', sport),
        ]);

        setData({
          progress: progressRes.data,
          metrics: metricsRes.data,
          latestDiagnostic: diagnosticRes.data,
          unlocks: (unlocksRes.data || []).map(u => u.unlock_type),
        });
      } catch (error) {
        console.error('Error fetching Tex Vision data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading || isLoading) {
    return (
      <Card className="border-teal-500/20">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-32 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.progress) {
    return null; // Don't show if no Tex Vision data
  }

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-teal-400';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-400';
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-background">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-5 w-5 text-teal-400" />
                Tex Vision Training
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-teal-500/10 border-teal-500/30">
                  <Flame className="h-3 w-3 mr-1 text-orange-400" />
                  {data.progress.streak_current} day streak
                </Badge>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-background/50 rounded-lg">
                <div className="text-lg font-bold text-teal-400">{data.progress.total_sessions_completed}</div>
                <div className="text-xs text-muted-foreground">Sessions</div>
              </div>
              <div className="p-2 bg-background/50 rounded-lg">
                <div className="text-lg font-bold text-orange-400">{data.progress.streak_longest}</div>
                <div className="text-xs text-muted-foreground">Best Streak</div>
              </div>
              <div className="p-2 bg-background/50 rounded-lg">
                <div className="text-lg font-bold capitalize">{data.progress.current_tier}</div>
                <div className="text-xs text-muted-foreground">Tier</div>
              </div>
            </div>

            {/* Metrics Summary */}
            {data.metrics && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Brain className="h-4 w-4 text-teal-400" />
                  Performance Metrics
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {data.metrics.neuro_reaction_index !== null && (
                    <div className="flex justify-between p-2 bg-background/30 rounded">
                      <span className="text-muted-foreground">Reaction Index</span>
                      <span className={getScoreColor(data.metrics.neuro_reaction_index)}>
                        {Math.round(data.metrics.neuro_reaction_index)}
                      </span>
                    </div>
                  )}
                  {data.metrics.visual_processing_speed !== null && (
                    <div className="flex justify-between p-2 bg-background/30 rounded">
                      <span className="text-muted-foreground">Visual Speed</span>
                      <span className={getScoreColor(data.metrics.visual_processing_speed)}>
                        {Math.round(data.metrics.visual_processing_speed)}
                      </span>
                    </div>
                  )}
                  {data.metrics.anticipation_quotient !== null && (
                    <div className="flex justify-between p-2 bg-background/30 rounded">
                      <span className="text-muted-foreground">Anticipation</span>
                      <span className={getScoreColor(data.metrics.anticipation_quotient)}>
                        {Math.round(data.metrics.anticipation_quotient)}
                      </span>
                    </div>
                  )}
                  {data.metrics.coordination_efficiency !== null && (
                    <div className="flex justify-between p-2 bg-background/30 rounded">
                      <span className="text-muted-foreground">Coordination</span>
                      <span className={getScoreColor(data.metrics.coordination_efficiency)}>
                        {Math.round(data.metrics.coordination_efficiency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* S2 Diagnostic */}
            {data.latestDiagnostic && (
              <div className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">S2 Cognition Score</div>
                    <div className={`text-2xl font-bold ${getScoreColor(data.latestDiagnostic.overall_score)}`}>
                      {data.latestDiagnostic.overall_score}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Last Test</div>
                    <div className="text-sm">{format(new Date(data.latestDiagnostic.test_date), 'MMM d')}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tier Badges */}
            {data.unlocks.length > 0 && (
              <div className="flex gap-2">
                {data.unlocks.includes('advanced_tier') && (
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    <Trophy className="h-3 w-3 mr-1" />
                    Advanced
                  </Badge>
                )}
                {data.unlocks.includes('chaos_tier') && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <Trophy className="h-3 w-3 mr-1" />
                    Chaos
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
