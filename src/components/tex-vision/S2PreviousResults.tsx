import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight,
  Download, 
  Brain, 
  Target, 
  AlertTriangle,
  History,
  FileText,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { S2RadarChart } from './diagnostics/S2RadarChart';
import { s2BaseballTranslations, getScoreLabel, scoreLabels } from '@/data/s2BaseballTranslations';
import { toast } from 'sonner';

interface S2HistoricalResult {
  id: string;
  test_date: string;
  completed_at: string | null;
  overall_score: number | null;
  processing_speed_score: number | null;
  decision_efficiency_score: number | null;
  visual_motor_integration_score: number | null;
  visual_tracking_score: number | null;
  peripheral_awareness_score: number | null;
  processing_under_load_score: number | null;
  impulse_control_score: number | null;
  fatigue_index_score: number | null;
  comparison_vs_prior: {
    processing_speed_change?: number | null;
    decision_efficiency_change?: number | null;
    visual_motor_change?: number | null;
    visual_tracking_change?: number | null;
    peripheral_awareness_change?: number | null;
    processing_under_load_change?: number | null;
    impulse_control_change?: number | null;
    fatigue_index_change?: number | null;
    overall_change?: number | null;
  } | null;
}

interface S2PreviousResultsProps {
  sport: string;
}

const scoreKeys = [
  { key: 'processing_speed_score', label: 'Processing Speed', area: 'processing_speed' },
  { key: 'decision_efficiency_score', label: 'Decision Efficiency', area: 'decision_efficiency' },
  { key: 'visual_motor_integration_score', label: 'Visual-Motor', area: 'visual_motor' },
  { key: 'visual_tracking_score', label: 'Visual Tracking', area: 'visual_tracking' },
  { key: 'peripheral_awareness_score', label: 'Peripheral Awareness', area: 'peripheral_awareness' },
  { key: 'processing_under_load_score', label: 'Processing Under Load', area: 'processing_under_load' },
  { key: 'impulse_control_score', label: 'Impulse Control', area: 'impulse_control' },
  { key: 'fatigue_index_score', label: 'Fatigue Index', area: 'fatigue_index' },
];

export default function S2PreviousResults({ sport }: S2PreviousResultsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [results, setResults] = useState<S2HistoricalResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('tex_vision_s2_diagnostics')
          .select('*')
          .eq('user_id', user.id)
          .eq('sport', sport)
          .not('completed_at', 'is', null)
          .order('test_date', { ascending: false });

        if (error) throw error;

        setResults((data || []).map(item => ({
          ...item,
          comparison_vs_prior: item.comparison_vs_prior as S2HistoricalResult['comparison_vs_prior'],
        })));
      } catch (error) {
        console.error('Error fetching S2 results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [user, sport]);

  const generateDownloadContent = (result: S2HistoricalResult): string => {
    const scoreInfo = result.overall_score ? getScoreLabel(result.overall_score) : null;
    const testDate = format(new Date(result.test_date), 'MMMM d, yyyy');
    
    let content = `S2 COGNITION DIAGNOSTIC RESULTS\n`;
    content += `================================\n\n`;
    content += `Test Date: ${testDate}\n`;
    content += `Overall Score: ${result.overall_score || 'N/A'} / 100`;
    if (scoreInfo) content += ` (${scoreInfo.label})`;
    content += `\n\n`;

    content += `COGNITIVE SCORES\n`;
    content += `----------------\n`;
    scoreKeys.forEach(({ key, label }) => {
      const score = result[key as keyof S2HistoricalResult] as number | null;
      const scoreLabel = score ? getScoreLabel(score).label : 'N/A';
      content += `${label}: ${score || 'N/A'} (${scoreLabel})\n`;
    });
    content += `\n`;

    // Strengths and limiters
    const scores = scoreKeys
      .map(({ key, label, area }) => ({
        key,
        label,
        area,
        value: result[key as keyof S2HistoricalResult] as number | null,
      }))
      .filter(s => s.value !== null)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    if (scores.length > 0) {
      const strengths = scores.slice(0, 3);
      const limiters = scores.slice(-3).reverse();

      content += `TOP STRENGTHS\n`;
      content += `-------------\n`;
      strengths.forEach(s => {
        const translation = s2BaseballTranslations[s.area];
        content += `• ${s.label}: ${s.value}\n`;
        if (translation) content += `  → ${translation.highScoreMessage}\n`;
      });
      content += `\n`;

      content += `AREAS FOR IMPROVEMENT\n`;
      content += `---------------------\n`;
      limiters.forEach(s => {
        const translation = s2BaseballTranslations[s.area];
        content += `• ${s.label}: ${s.value}\n`;
        if (translation) content += `  → ${translation.lowScoreMessage}\n`;
      });
    }

    content += `\n================================\n`;
    content += `Generated by Tex Vision S2 Cognition Diagnostics\n`;

    return content;
  };

  const handleDownload = (result: S2HistoricalResult) => {
    const content = generateDownloadContent(result);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `S2-Results-${format(new Date(result.test_date), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Results downloaded');
  };

  const getScoresObject = (result: S2HistoricalResult) => ({
    processing_speed: result.processing_speed_score || 0,
    decision_efficiency: result.decision_efficiency_score || 0,
    visual_motor: result.visual_motor_integration_score || 0,
    visual_tracking: result.visual_tracking_score || 0,
    peripheral_awareness: result.peripheral_awareness_score || 0,
    processing_under_load: result.processing_under_load_score || 0,
    impulse_control: result.impulse_control_score || 0,
    fatigue_index: result.fatigue_index_score || 0,
  });

  // Don't show if no results
  if (!loading && results.length === 0) {
    return null;
  }

  return (
    <Card className="bg-[hsl(var(--tex-vision-primary))]/50 border-[hsl(var(--tex-vision-primary-light))]/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-[hsl(var(--tex-vision-primary-light))]/10 transition-colors">
            <CardTitle className="flex items-center justify-between text-lg text-blue-900">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-teal-600" />
                {t('texVision.s2.previousResults', 'Previous S2 Results')}
                {results.length > 0 && (
                  <Badge variant="outline" className="ml-2 bg-teal-500/10 text-teal-700 border-teal-500/30">
                    {results.length} {results.length === 1 ? 'test' : 'tests'}
                  </Badge>
                )}
              </div>
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-blue-900/60" />
              ) : (
                <ChevronRight className="h-5 w-5 text-blue-900/60" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-20 bg-[hsl(var(--tex-vision-primary-light))]/50" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result) => {
                  const scoreInfo = result.overall_score ? getScoreLabel(result.overall_score) : null;
                  const isExpanded = expandedResult === result.id;
                  const scores = getScoresObject(result);

                  // Get strengths and limiters
                  const sortedScores = Object.entries(scores)
                    .map(([key, value]) => ({ key, value, translation: s2BaseballTranslations[key] }))
                    .sort((a, b) => b.value - a.value);
                  const strengths = sortedScores.slice(0, 3);
                  const limiters = sortedScores.slice(-3).reverse();

                  return (
                    <Collapsible key={result.id} open={isExpanded} onOpenChange={(open) => setExpandedResult(open ? result.id : null)}>
                      <div className="border border-[hsl(var(--tex-vision-primary-light))]/30 rounded-lg overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <div className="p-4 cursor-pointer hover:bg-[hsl(var(--tex-vision-primary-light))]/10 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="text-center">
                                  <div className={`text-2xl font-bold ${scoreInfo?.color || 'text-blue-900'}`}>
                                    {result.overall_score || '—'}
                                  </div>
                                  <div className="text-[10px] text-blue-900/60">Score</div>
                                </div>
                                <div>
                                  <div className="font-medium text-blue-900">
                                    {format(new Date(result.test_date), 'MMMM d, yyyy')}
                                  </div>
                                  {scoreInfo && (
                                    <Badge className={`${scoreInfo.bgColor} ${scoreInfo.color} text-[10px] mt-1`}>
                                      {scoreInfo.label}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-teal-700 border-teal-500/30 hover:bg-teal-500/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(result);
                                  }}
                                >
                                  <Download className="h-3.5 w-3.5 mr-1" />
                                  Download
                                </Button>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-blue-900/60" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-blue-900/60" />
                                )}
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <AnimatePresence>
                          {isExpanded && (
                            <CollapsibleContent forceMount>
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="border-t border-[hsl(var(--tex-vision-primary-light))]/30"
                              >
                                <div className="p-4 space-y-4 bg-[hsl(var(--tex-vision-primary-dark))]/30">
                                  {/* Radar Chart */}
                                  <div className="bg-white/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Brain className="h-4 w-4 text-teal-600" />
                                      <span className="font-medium text-sm text-blue-900">Cognitive Profile</span>
                                    </div>
                                    <S2RadarChart scores={scores} />
                                  </div>

                                  {/* Strengths & Limiters */}
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                                      <div className="flex items-center gap-1.5 mb-2">
                                        <Target className="h-3.5 w-3.5 text-emerald-600" />
                                        <span className="text-xs font-medium text-emerald-700">Strengths</span>
                                      </div>
                                      <div className="space-y-1.5">
                                        {strengths.map(({ key, value, translation }) => (
                                          <div key={key} className="flex items-center justify-between text-xs">
                                            <span className="text-blue-900 truncate">{translation?.area || key}</span>
                                            <Badge variant="outline" className="text-emerald-700 border-emerald-500/30 text-[10px]">
                                              {value}
                                            </Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                                      <div className="flex items-center gap-1.5 mb-2">
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                        <span className="text-xs font-medium text-amber-700">Limiters</span>
                                      </div>
                                      <div className="space-y-1.5">
                                        {limiters.map(({ key, value, translation }) => (
                                          <div key={key} className="flex items-center justify-between text-xs">
                                            <span className="text-blue-900 truncate">{translation?.area || key}</span>
                                            <Badge variant="outline" className="text-amber-700 border-amber-500/30 text-[10px]">
                                              {value}
                                            </Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  {/* All Scores Breakdown */}
                                  <div className="bg-white/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <FileText className="h-4 w-4 text-teal-600" />
                                      <span className="font-medium text-sm text-blue-900">Full Breakdown</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {scoreKeys.map(({ key, label }) => {
                                        const score = result[key as keyof S2HistoricalResult] as number | null;
                                        const itemInfo = score ? getScoreLabel(score) : null;
                                        return (
                                          <div key={key} className="flex items-center justify-between p-2 bg-[hsl(var(--tex-vision-primary))]/30 rounded">
                                            <span className="text-xs text-blue-900">{label}</span>
                                            <div className="flex items-center gap-1.5">
                                              <span className={`text-sm font-medium ${itemInfo?.color || 'text-blue-900'}`}>
                                                {score || '—'}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            </CollapsibleContent>
                          )}
                        </AnimatePresence>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
