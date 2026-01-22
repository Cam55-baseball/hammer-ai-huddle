import { useState, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Flame, Trophy, Calendar, Award, Sparkles, ChevronDown,
  FileText, TrendingUp, Dumbbell, Brain, Target, Activity,
  Zap, Lightbulb, CheckCircle2, Heart, AlertCircle,
  Bookmark, BookmarkCheck, Download, Share2, Trash2
} from 'lucide-react';
import { FaXTwitter, FaInstagram } from 'react-icons/fa6';
import { VaultStreak } from '@/hooks/useVault';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateRecapPdf } from '@/utils/generateRecapPdf';
import { generateRecapShareImage } from '@/utils/generateRecapShareImage';

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
  saved_to_library?: boolean;
}

interface VaultStreakRecapCardProps {
  streak: VaultStreak | null;
  recaps: VaultRecap[];
  canGenerateRecap: boolean;
  daysUntilNextRecap: number;
  recapProgress: number;
  onGenerateRecap: (periodEnd?: Date) => Promise<{ success: boolean }>;
  onSaveRecap?: (recapId: string) => Promise<{ success: boolean }>;
  onDeleteRecap?: (recapId: string) => Promise<{ success: boolean }>;
  isLoading?: boolean;
  hasMissedRecap?: boolean;
  missedCycleEnd?: Date | null;
  athleteName?: string;
  waitingForProgressReports?: boolean;
  onGoToProgressReports?: () => void;
}

export const VaultStreakRecapCard = forwardRef<HTMLDivElement, VaultStreakRecapCardProps>(({ 
  streak, 
  recaps, 
  canGenerateRecap, 
  daysUntilNextRecap,
  recapProgress,
  onGenerateRecap,
  onSaveRecap,
  onDeleteRecap,
  isLoading,
  hasMissedRecap = false,
  missedCycleEnd = null,
  athleteName = 'Athlete',
  waitingForProgressReports = false,
  onGoToProgressReports,
}, ref) => {
  const { t } = useTranslation();
  const [recapsOpen, setRecapsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedRecap, setSelectedRecap] = useState<VaultRecap | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<'save' | 'delete' | 'pdf' | 'share' | null>(null);

  const currentStreak = streak?.current_streak || 0;
  const longestStreak = streak?.longest_streak || 0;
  const totalEntries = streak?.total_entries || 0;
  const badges = streak?.badges_earned || [];

  const getStreakColor = () => {
    if (currentStreak >= 25) return 'text-orange-400';
    if (currentStreak >= 5) return 'text-orange-500';
    return 'text-muted-foreground';
  };

  const getStreakGlow = () => currentStreak >= 25;

  const showRecapButton = (canGenerateRecap || hasMissedRecap) && !waitingForProgressReports;

  const handleGenerate = async () => {
    setGenerating(true);
    if (hasMissedRecap && missedCycleEnd) {
      await onGenerateRecap(missedCycleEnd);
    } else {
      await onGenerateRecap();
    }
    setGenerating(false);
  };

  const handleViewRecap = (recap: VaultRecap) => {
    setSelectedRecap(recap);
    setViewDialogOpen(true);
  };

  const handleSaveRecap = async () => {
    if (!selectedRecap || !onSaveRecap) return;
    setActionLoading('save');
    const result = await onSaveRecap(selectedRecap.id);
    if (result.success) {
      toast.success(t('vault.recap.recapSaved'));
      setSelectedRecap({ ...selectedRecap, saved_to_library: true });
    }
    setActionLoading(null);
  };

  const handleDownloadPdf = async () => {
    if (!selectedRecap) return;
    setActionLoading('pdf');
    try {
      await generateRecapPdf(selectedRecap);
      toast.success(t('vault.recap.pdfDownloaded'));
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
    setActionLoading(null);
  };

  const handleShareToTwitter = async () => {
    if (!selectedRecap) return;
    setActionLoading('share');
    
    try {
      const imageBlob = await generateRecapShareImage(selectedRecap);
      const url = URL.createObjectURL(imageBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `training-recap-${selectedRecap.recap_period_end}.png`;
      link.click();
      URL.revokeObjectURL(url);
      
      const tweetText = encodeURIComponent(
        `Just completed my 6-week training recap! 💪\n\n` +
        `📊 ${selectedRecap.recap_data.workout_stats?.total_workouts || 0} workouts\n` +
        `🏋️ ${selectedRecap.total_weight_lifted?.toLocaleString() || 0} lbs lifted\n\n` +
        `#Training #Athlete #HammersModality`
      );
      window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank');
      
      toast.success(t('vault.recap.imageCreated'));
      setShareDialogOpen(false);
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to create share image');
    }
    
    setActionLoading(null);
  };

  const handleShareToInstagram = async () => {
    if (!selectedRecap) return;
    setActionLoading('share');
    
    try {
      const imageBlob = await generateRecapShareImage(selectedRecap);
      const url = URL.createObjectURL(imageBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `training-recap-${selectedRecap.recap_period_end}.png`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success(t('vault.recap.imageCreated') + ' ' + t('vault.recap.uploadToInstagram'));
      setShareDialogOpen(false);
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to create share image');
    }
    
    setActionLoading(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedRecap || !onDeleteRecap) return;
    setActionLoading('delete');
    const result = await onDeleteRecap(selectedRecap.id);
    if (result.success) {
      toast.success(t('vault.recap.recapDeleted'));
      setViewDialogOpen(false);
      setSelectedRecap(null);
    }
    setActionLoading(null);
    setDeleteDialogOpen(false);
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-background via-primary/5 to-orange-500/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="h-2 w-full bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        ref={ref}
        className={cn(
          "overflow-hidden border-primary/20 bg-gradient-to-br from-background via-primary/5 to-orange-500/5 transition-all duration-300",
          showRecapButton && "ring-2 ring-violet-500 ring-offset-2 ring-offset-background"
        )}
      >
        <CardContent className="p-4 space-y-4">
          {/* Header Row: Streak + Stats */}
          <div className="flex items-center gap-4">
            <div className={cn(
              "relative flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30",
              getStreakGlow() && "animate-pulse"
            )}>
              <Flame className={cn("h-6 w-6", getStreakColor())} />
              {currentStreak > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {currentStreak}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-lg">
                  {currentStreak} {currentStreak === 1 ? t('vault.streak.day') : t('vault.streak.days')}
                </span>
                {currentStreak >= 7 && <span className="text-lg">🔥</span>}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-yellow-500" />
                  {t('vault.streak.longest')}: {longestStreak}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-blue-500" />
                  {totalEntries} {t('vault.streak.entries')}
                </span>
              </div>
            </div>
          </div>

          {/* 6-Week Progress */}
          <div className={cn(
            "p-3 rounded-lg space-y-2 transition-all duration-300",
            showRecapButton 
              ? "bg-violet-500/20 border-2 border-violet-500" 
              : "bg-violet-500/10 border border-violet-500/20"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-medium">{t('vault.recap.sixWeekCycle')}</span>
              </div>
              <div className="flex items-center gap-2">
                {hasMissedRecap && (
                  <Badge variant="destructive" className="text-xs gap-1 animate-pulse">
                    <AlertCircle className="h-3 w-3" />
                    {t('vault.recap.missed')}
                  </Badge>
                )}
                {canGenerateRecap && !hasMissedRecap ? (
                  <Badge className="bg-violet-500 text-white text-xs">{t('vault.recap.ready')}</Badge>
                ) : !hasMissedRecap && (
                  <Badge variant="outline" className="text-xs">
                    {daysUntilNextRecap} {t('vault.recap.daysLeft')}
                  </Badge>
                )}
              </div>
            </div>
            <Progress value={waitingForProgressReports ? 100 : recapProgress} className="h-2" />
            
            {waitingForProgressReports ? (
              <Button 
                onClick={onGoToProgressReports} 
                size="sm" 
                className="w-full gap-2 mt-2 bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                <Target className="h-3 w-3" />
                {t('gamePlan.recapCountdown.completeProgressReports')}
              </Button>
            ) : showRecapButton ? (
              <Button 
                onClick={handleGenerate} 
                disabled={generating} 
                size="sm" 
                className={cn(
                  "w-full gap-2 mt-2 bg-violet-500 hover:bg-violet-600 text-white",
                  !generating && "animate-pulse"
                )}
              >
                {generating ? (
                  <>
                    <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {t('vault.recap.analyzing')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    {hasMissedRecap ? t('vault.recap.generateMissed') : t('vault.recap.generate')}
                  </>
                )}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                {t('vault.recap.keepLogging')}
              </p>
            )}
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {badges.slice(0, 3).map((badge) => (
                <Badge key={badge} variant="outline" className="text-xs gap-1 py-0.5">
                  {getBadgeIcon(badge)}
                  <span className="hidden sm:inline">{t(`vault.badges.${badge}`, badge.replace(/_/g, ' '))}</span>
                </Badge>
              ))}
              {badges.length > 3 && (
                <Badge variant="outline" className="text-xs py-0.5">
                  +{badges.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Past Recaps */}
          {recaps.length > 0 && (
            <Collapsible open={recapsOpen} onOpenChange={setRecapsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">{t('vault.recap.pastRecaps')}</span>
                  <Badge variant="secondary" className="text-xs">{recaps.length}</Badge>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", recapsOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ScrollArea className="max-h-[150px] mt-2">
                  <div className="space-y-2">
                    {recaps.map((recap) => (
                      <div
                        key={recap.id}
                        onClick={() => handleViewRecap(recap)}
                        className="p-2 rounded-lg bg-muted/50 border border-border hover:bg-muted/70 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium flex items-center gap-1.5">
                            {recap.saved_to_library && (
                              <BookmarkCheck className="h-3 w-3 text-green-500" />
                            )}
                            {new Date(recap.recap_period_start).toLocaleDateString()} - {new Date(recap.recap_period_end).toLocaleDateString()}
                          </span>
                          {recap.strength_change_percent !== null && recap.strength_change_percent !== 0 && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs gap-1",
                                recap.strength_change_percent > 0 ? 'text-green-500 border-green-500' : 'text-red-500 border-red-500'
                              )}
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
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Motivational Quote */}
          <div className="text-center pt-3 border-t border-primary/10">
            <p className="text-xs italic text-muted-foreground">
              "{t('vault.reminder.stayConsistent')}"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recap Detail Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <FileText className="h-5 w-5 text-violet-500" />
              {t('vault.recap.detailTitle')}
              <Badge variant="outline" className="text-xs gap-1">
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
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                {selectedRecap.recap_data.workout_stats && (
                  <>
                    <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
                      <Dumbbell className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                      <p className="text-lg font-bold">{selectedRecap.recap_data.workout_stats.total_workouts}</p>
                      <p className="text-xs text-muted-foreground">{t('vault.recap.workoutsLabel')}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-center">
                      <Activity className="h-4 w-4 mx-auto mb-1 text-violet-500" />
                      <p className="text-lg font-bold">{selectedRecap.total_weight_lifted?.toLocaleString() || 0}</p>
                      <p className="text-xs text-muted-foreground">{t('vault.recap.totalLbs')}</p>
                    </div>
                  </>
                )}
              </div>

              {/* AI Summary */}
              {selectedRecap.recap_data.summary && (
                <div className="p-3 rounded-lg bg-gradient-to-br from-violet-500/10 to-primary/5 border border-violet-500/20">
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
                  {selectedRecap.recap_data.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <span className="text-sm">{h}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Improvements */}
              {selectedRecap.recap_data.improvements && selectedRecap.recap_data.improvements.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    {t('vault.recap.improvements')}
                  </h4>
                  {selectedRecap.recap_data.improvements.map((imp, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                      <Zap className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-sm">{imp}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {selectedRecap.recap_data.recommendations && selectedRecap.recap_data.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    {t('vault.recap.recommendations')}
                  </h4>
                  {selectedRecap.recap_data.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                      <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm">{rec}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t mt-4">
                {/* Save Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveRecap}
                  disabled={actionLoading !== null || selectedRecap?.saved_to_library}
                  className="gap-2"
                >
                  {selectedRecap?.saved_to_library ? (
                    <>
                      <BookmarkCheck className="h-4 w-4 text-green-500" />
                      {t('vault.recap.savedToLibrary')}
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-4 w-4" />
                      {t('vault.recap.saveRecap')}
                    </>
                  )}
                </Button>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Download PDF */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPdf}
                    disabled={actionLoading !== null}
                    className="gap-2"
                  >
                    {actionLoading === 'pdf' ? (
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {t('vault.recap.downloadPdf')}
                  </Button>


                  {/* Share */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShareDialogOpen(true)}
                    disabled={actionLoading !== null}
                    className="gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    {t('vault.recap.shareToSocial')}
                  </Button>

                  {/* Delete */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={actionLoading !== null}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('vault.recap.deleteRecap')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('vault.recap.confirmDelete')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionLoading === 'delete' ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Social Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              {t('vault.recap.shareToSocial')}
            </DialogTitle>
            <DialogDescription>
              Share your training progress on social media
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-24 flex-col gap-2"
              onClick={handleShareToTwitter}
              disabled={actionLoading === 'share'}
            >
              <FaXTwitter className="h-8 w-8" />
              {t('vault.recap.shareToTwitter')}
            </Button>
            
            <Button 
              variant="outline" 
              className="h-24 flex-col gap-2"
              onClick={handleShareToInstagram}
              disabled={actionLoading === 'share'}
            >
              <FaInstagram className="h-8 w-8" />
              {t('vault.recap.shareToInstagram')}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center mt-4">
            A share image will be downloaded. Upload it to your social media platform.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
});

VaultStreakRecapCard.displayName = 'VaultStreakRecapCard';

function getBadgeIcon(badge: string): string {
  switch (badge) {
    case 'week_warrior': return '🏅';
    case 'two_week_titan': return '⭐';
    case 'monthly_master': return '🏆';
    case 'sixty_day_sentinel': return '💎';
    case 'century_champion': return '👑';
    default: return '🎖️';
  }
}
