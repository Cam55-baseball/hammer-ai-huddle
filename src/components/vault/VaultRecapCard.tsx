import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  FileText, ChevronDown, Calendar, TrendingUp, Dumbbell, 
  Brain, Target, Award, Sparkles, Lightbulb, CheckCircle2,
  Activity, Zap, Heart
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface VaultRecap {
  id: string;
  recap_period_start: string;
  recap_period_end: string;
  total_weight_lifted: number | null;
  strength_change_percent: number | null;
  recap_data: {
    summary?: string;
    highlights?: string[];
    improvements?: string[];
    focus_areas?: string[];
    recommendations?: string[];
    workout_stats?: {
      total_workouts: number;
      total_weight: number;
      weight_increases: number;
      avg_session_weight: number;
    };
    mental_stats?: {
      avg_mental: number;
      avg_emotional: number;
      avg_physical: number;
      quiz_count: number;
    };
    nutrition_stats?: {
      avg_calories: number;
      avg_protein: number;
      avg_energy: number;
      logs_count: number;
    };
    performance_tests?: number;
  };
  generated_at: string;
}

interface VaultRecapCardProps {
  recaps: VaultRecap[];
  canGenerate: boolean;
  daysUntilNextRecap: number;
  onGenerate: () => Promise<{ success: boolean }>;
}

export function VaultRecapCard({ recaps, canGenerate, daysUntilNextRecap, onGenerate }: VaultRecapCardProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedRecap, setSelectedRecap] = useState<VaultRecap | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    await onGenerate();
    setGenerating(false);
  };

  const handleViewRecap = (recap: VaultRecap) => {
    setSelectedRecap(recap);
    setViewDialogOpen(true);
  };

  return (
    <>
      <Card>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-violet-500" />
                  <CardTitle className="text-lg">{t('vault.recap.title')}</CardTitle>
                  {recaps.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{recaps.length}</Badge>
                  )}
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
              <CardDescription>{t('vault.recap.description')}</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Generate Button */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-violet-500/10 to-primary/10 border border-violet-500/20">
                {canGenerate ? (
                  <div className="text-center space-y-3">
                    <div className="relative">
                      <Award className="h-10 w-10 mx-auto text-violet-500" />
                      <Sparkles className="h-4 w-4 absolute -top-1 -right-1 text-amber-500 animate-pulse" />
                    </div>
                    <p className="text-sm font-medium">{t('vault.recap.readyToGenerate')}</p>
                    <p className="text-xs text-muted-foreground">{t('vault.recap.aiPoweredInsights')}</p>
                    <Button onClick={handleGenerate} disabled={generating} className="w-full gap-2">
                      {generating ? (
                        <>
                          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          {t('vault.recap.analyzing')}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          {t('vault.recap.generate')}
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <Calendar className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {t('vault.recap.daysRemaining', { days: daysUntilNextRecap })}
                    </p>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-violet-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.max(0, 100 - (daysUntilNextRecap / 42) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Past Recaps */}
              {recaps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">{t('vault.recap.pastRecaps')}</h4>
                  <ScrollArea className="max-h-[250px]">
                    <div className="space-y-2">
                      {recaps.map((recap) => (
                        <div
                          key={recap.id}
                          className="p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted/70 transition-colors cursor-pointer"
                          onClick={() => handleViewRecap(recap)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {new Date(recap.recap_period_start).toLocaleDateString()} - {new Date(recap.recap_period_end).toLocaleDateString()}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs gap-1">
                              <Sparkles className="h-3 w-3" />
                              AI
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {recap.total_weight_lifted && recap.total_weight_lifted > 0 && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Dumbbell className="h-3 w-3" />
                                {recap.total_weight_lifted.toLocaleString()} lbs
                              </Badge>
                            )}
                            {recap.strength_change_percent !== null && recap.strength_change_percent !== 0 && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs gap-1 ${
                                  recap.strength_change_percent > 0 ? 'text-green-500 border-green-500' : 
                                  recap.strength_change_percent < 0 ? 'text-red-500 border-red-500' : ''
                                }`}
                              >
                                <TrendingUp className="h-3 w-3" />
                                {recap.strength_change_percent > 0 ? '+' : ''}{recap.strength_change_percent}%
                              </Badge>
                            )}
                            {recap.recap_data.workout_stats?.total_workouts && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Activity className="h-3 w-3" />
                                {recap.recap_data.workout_stats.total_workouts} {t('vault.recap.workoutsLabel')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Recap Detail Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-violet-500" />
              {t('vault.recap.detailTitle')}
              <Badge variant="outline" className="text-xs gap-1 ml-2">
                <Sparkles className="h-3 w-3" />
                {t('vault.recap.aiGenerated')}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {selectedRecap && (
                <span>
                  {new Date(selectedRecap.recap_period_start).toLocaleDateString()} - {new Date(selectedRecap.recap_period_end).toLocaleDateString()}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedRecap && (
            <div className="space-y-5">
              {/* Stats Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {selectedRecap.recap_data.workout_stats && (
                  <>
                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
                      <Dumbbell className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                      <p className="text-lg font-bold">{selectedRecap.recap_data.workout_stats.total_workouts}</p>
                      <p className="text-xs text-muted-foreground">{t('vault.recap.workoutsLabel')}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 text-center">
                      <Activity className="h-5 w-5 mx-auto mb-1 text-violet-500" />
                      <p className="text-lg font-bold">{selectedRecap.total_weight_lifted?.toLocaleString() || 0}</p>
                      <p className="text-xs text-muted-foreground">{t('vault.recap.totalLbs')}</p>
                    </div>
                  </>
                )}
                {selectedRecap.strength_change_percent !== null && (
                  <div className={`p-3 rounded-lg text-center ${
                    selectedRecap.strength_change_percent > 0 ? 'bg-green-500/10 border border-green-500/20' : 
                    selectedRecap.strength_change_percent < 0 ? 'bg-red-500/10 border border-red-500/20' : 
                    'bg-muted/50 border border-border'
                  }`}>
                    <TrendingUp className={`h-5 w-5 mx-auto mb-1 ${
                      selectedRecap.strength_change_percent > 0 ? 'text-green-500' : 
                      selectedRecap.strength_change_percent < 0 ? 'text-red-500' : 'text-muted-foreground'
                    }`} />
                    <p className="text-lg font-bold">
                      {selectedRecap.strength_change_percent > 0 ? '+' : ''}{selectedRecap.strength_change_percent}%
                    </p>
                    <p className="text-xs text-muted-foreground">{t('vault.recap.strength')}</p>
                  </div>
                )}
                {selectedRecap.recap_data.mental_stats && selectedRecap.recap_data.mental_stats.quiz_count > 0 && (
                  <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-center">
                    <Brain className="h-5 w-5 mx-auto mb-1 text-cyan-500" />
                    <p className="text-lg font-bold">{selectedRecap.recap_data.mental_stats.avg_mental.toFixed(1)}/5</p>
                    <p className="text-xs text-muted-foreground">{t('vault.recap.avgMental')}</p>
                  </div>
                )}
              </div>

              {/* AI Summary */}
              {selectedRecap.recap_data.summary && (
                <div className="p-4 rounded-lg bg-gradient-to-br from-violet-500/10 to-primary/5 border border-violet-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    <h4 className="text-sm font-semibold">{t('vault.recap.summary')}</h4>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{selectedRecap.recap_data.summary}</p>
                </div>
              )}

              {/* Highlights */}
              {selectedRecap.recap_data.highlights && selectedRecap.recap_data.highlights.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    {t('vault.recap.highlights')}
                  </h4>
                  <div className="space-y-2">
                    {selectedRecap.recap_data.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                        <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <span className="text-sm">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Improvements */}
              {selectedRecap.recap_data.improvements && selectedRecap.recap_data.improvements.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    {t('vault.recap.improvements')}
                  </h4>
                  <div className="space-y-2">
                    {selectedRecap.recap_data.improvements.map((imp, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                        <Zap className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm">{imp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Focus Areas */}
              {selectedRecap.recap_data.focus_areas && selectedRecap.recap_data.focus_areas.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-cyan-500" />
                    {t('vault.recap.focusAreas')}
                  </h4>
                  <div className="space-y-2">
                    {selectedRecap.recap_data.focus_areas.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                        <Target className="h-4 w-4 text-cyan-500 mt-0.5 shrink-0" />
                        <span className="text-sm">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {selectedRecap.recap_data.recommendations && selectedRecap.recap_data.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    {t('vault.recap.recommendations')}
                  </h4>
                  <div className="space-y-2">
                    {selectedRecap.recap_data.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                        <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Stats */}
              {(selectedRecap.recap_data.mental_stats?.quiz_count || selectedRecap.recap_data.nutrition_stats?.logs_count) && (
                <div className="pt-3 border-t border-border">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t('vault.recap.additionalData')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecap.recap_data.mental_stats && selectedRecap.recap_data.mental_stats.quiz_count > 0 && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Heart className="h-3 w-3" />
                        {selectedRecap.recap_data.mental_stats.quiz_count} {t('vault.recap.focusQuizzes')}
                      </Badge>
                    )}
                    {selectedRecap.recap_data.nutrition_stats && selectedRecap.recap_data.nutrition_stats.logs_count > 0 && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Activity className="h-3 w-3" />
                        {selectedRecap.recap_data.nutrition_stats.logs_count} {t('vault.recap.nutritionLogs')}
                      </Badge>
                    )}
                    {selectedRecap.recap_data.workout_stats?.weight_increases && selectedRecap.recap_data.workout_stats.weight_increases > 0 && (
                      <Badge variant="secondary" className="text-xs gap-1 text-green-600">
                        <TrendingUp className="h-3 w-3" />
                        {selectedRecap.recap_data.workout_stats.weight_increases} {t('vault.recap.weightIncreases')}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
