import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  FileText, ChevronDown, Calendar, TrendingUp, Dumbbell, 
  Brain, Target, Award, Download, Eye 
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
    workout_stats?: {
      total_workouts: number;
      total_weight: number;
      avg_intensity: number;
    };
    mental_stats?: {
      avg_readiness: number;
      best_days: string[];
    };
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
                    <Award className="h-10 w-10 mx-auto text-violet-500" />
                    <p className="text-sm font-medium">{t('vault.recap.readyToGenerate')}</p>
                    <Button onClick={handleGenerate} disabled={generating} className="w-full">
                      {generating ? t('common.loading') : t('vault.recap.generate')}
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
                          className="p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {new Date(recap.recap_period_start).toLocaleDateString()} - {new Date(recap.recap_period_end).toLocaleDateString()}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewRecap(recap)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {t('vault.recap.view')}
                            </Button>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {recap.total_weight_lifted && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Dumbbell className="h-3 w-3" />
                                {recap.total_weight_lifted.toLocaleString()} lbs
                              </Badge>
                            )}
                            {recap.strength_change_percent !== null && (
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
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-violet-500" />
              {t('vault.recap.detailTitle')}
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
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3">
                {selectedRecap.total_weight_lifted && (
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <Dumbbell className="h-6 w-6 mx-auto mb-1 text-orange-500" />
                    <p className="text-lg font-bold">{selectedRecap.total_weight_lifted.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{t('vault.recap.totalWeight')}</p>
                  </div>
                )}
                {selectedRecap.strength_change_percent !== null && (
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <TrendingUp className={`h-6 w-6 mx-auto mb-1 ${
                      selectedRecap.strength_change_percent > 0 ? 'text-green-500' : 'text-red-500'
                    }`} />
                    <p className="text-lg font-bold">
                      {selectedRecap.strength_change_percent > 0 ? '+' : ''}{selectedRecap.strength_change_percent}%
                    </p>
                    <p className="text-xs text-muted-foreground">{t('vault.recap.strengthChange')}</p>
                  </div>
                )}
              </div>

              {/* Summary */}
              {selectedRecap.recap_data.summary && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    {t('vault.recap.summary')}
                  </h4>
                  <p className="text-sm text-muted-foreground">{selectedRecap.recap_data.summary}</p>
                </div>
              )}

              {/* Highlights */}
              {selectedRecap.recap_data.highlights && selectedRecap.recap_data.highlights.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    {t('vault.recap.highlights')}
                  </h4>
                  <ul className="space-y-1">
                    {selectedRecap.recap_data.highlights.map((h, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-green-500">✓</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Focus Areas */}
              {selectedRecap.recap_data.focus_areas && selectedRecap.recap_data.focus_areas.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-cyan-500" />
                    {t('vault.recap.focusAreas')}
                  </h4>
                  <ul className="space-y-1">
                    {selectedRecap.recap_data.focus_areas.map((f, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-cyan-500">→</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
