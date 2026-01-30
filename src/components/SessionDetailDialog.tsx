import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { uploadOptimizedThumbnail, uploadThumbnailSizes } from '@/lib/uploadHelpers';
import { processVideoThumbnail } from '@/lib/thumbnailHelpers';
import { useScoutAccess } from '@/hooks/useScoutAccess';
import { TheScorecard } from '@/components/TheScorecard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Upload, X, Download, Play, Heart } from 'lucide-react';
import { useVault } from '@/hooks/useVault';
import { EnhancedVideoPlayer } from '@/components/EnhancedVideoPlayer';

interface SessionDetailDialogProps {
  session: any;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  isOwner: boolean;
}

export function SessionDetailDialog({
  session,
  open,
  onClose,
  onUpdate,
  isOwner,
}: SessionDetailDialogProps) {
  const { t } = useTranslation();
  const { isScout } = useScoutAccess();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(session.library_title || '');
  const [notes, setNotes] = useState(session.library_notes || '');
  const [sharedWithScouts, setSharedWithScouts] = useState(session.shared_with_scouts || false);
  const [analysisPublic, setAnalysisPublic] = useState(session.analysis_public || false);
  const [saving, setSaving] = useState(false);
  const [customThumbnail, setCustomThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const [showScorecard, setShowScorecard] = useState<boolean>(() => {
    return localStorage.getItem('showProgressReport') !== 'false';
  });
  const [scorecardFilter, setScorecardFilter] = useState<'all' | 'improvements' | 'regressions'>(() => {
    const saved = localStorage.getItem('scorecardDisplayFilter');
    return (saved === 'improvements' || saved === 'regressions') ? saved : 'all';
  });
  const [savedDrillIds, setSavedDrillIds] = useState<Set<string>>(new Set());
  const { saveDrill, savedDrills } = useVault();

  // Track which drills are already saved
  useEffect(() => {
    if (savedDrills && session.ai_analysis?.drills) {
      const saved = new Set(
        savedDrills
          .filter(d => d.module_origin === session.module && d.sport === session.sport)
          .map(d => d.drill_name)
      );
      setSavedDrillIds(saved);
    }
  }, [savedDrills, session.ai_analysis?.drills, session.module, session.sport]);

  const handleSaveDrill = async (drill: any) => {
    // Build complete description with explicit section markers for consistent parsing
    let fullDescription = `Purpose: ${drill.purpose || 'N/A'}`;
    
    if (drill.steps && drill.steps.length > 0) {
      fullDescription += `\n\nSteps:\n${drill.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`;
    }
    
    if (drill.reps_sets) {
      fullDescription += `\n\nReps/Sets: ${drill.reps_sets}`;
    }
    
    if (drill.equipment) {
      fullDescription += `\n\nEquipment: ${drill.equipment}`;
    }
    
    if (drill.cues && drill.cues.length > 0) {
      fullDescription += `\n\nCoaching Cues: ${drill.cues.join(', ')}`;
    }

    const result = await saveDrill({
      drill_name: drill.title,
      drill_description: fullDescription || null,
      module_origin: session.module || '',
      sport: session.sport,
    });

    if (result.success) {
      setSavedDrillIds(prev => new Set(prev).add(drill.title));
      toast.success(t('vault.drills.saveSuccess', 'Drill saved to your Vault!'));
    } else if (result.error === 'already_saved') {
      toast.info(t('vault.drills.alreadySaved', 'Already saved'));
    } else {
      toast.error(t('vault.drills.saveFailed', 'Failed to save drill'));
    }
  };

  const handleScorecardToggle = (checked: boolean) => {
    setShowScorecard(checked);
    localStorage.setItem('showProgressReport', String(checked));
  };

  const handleScorecardFilterChange = (value: string) => {
    if (value) {
      const filter = value as 'all' | 'improvements' | 'regressions';
      setScorecardFilter(filter);
      localStorage.setItem('scorecardDisplayFilter', filter);
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('sessionDetail.invalidImageType', 'Please upload a JPG, PNG, or WebP image'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('sessionDetail.imageTooLarge', 'Image must be smaller than 5MB'));
      return;
    }

    setCustomThumbnail(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setThumbnailPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveThumbnail = () => {
    setCustomThumbnail(null);
    setThumbnailPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Sync state when session changes and fetch annotations
  useEffect(() => {
    setSharedWithScouts(session.shared_with_scouts || false);
    setAnalysisPublic(session.analysis_public || false);
    
    if (open) {
      fetchAnnotations();
    }
  }, [session.shared_with_scouts, session.analysis_public, open]);

  const fetchAnnotations = async () => {
    try {
      setLoadingAnnotations(true);
      const { data, error } = await supabase.functions.invoke('get-video-annotations', {
        body: { videoId: session.id }
      });

      if (error) throw error;
      setAnnotations(data || []);
    } catch (error: any) {
      console.error('Error fetching annotations:', error);
    } finally {
      setLoadingAnnotations(false);
    }
  };

  const handleSaveAnnotation = async (annotationData: {
    annotationData: string;
    originalFrameData: string;
    notes?: string;
    frameTimestamp?: number;
  }) => {
    try {
      const { error } = await supabase.functions.invoke('save-video-annotation', {
        body: {
          videoId: session.id,
          playerId: session.user_id,
          isSelfAnnotation: false,
          ...annotationData
        }
      });

      if (error) throw error;

      toast.success(t('sessionDetail.annotationSaved', "Annotation saved to player's library"));
      fetchAnnotations();
    } catch (error: any) {
      console.error('Error saving annotation:', error);
      toast.error(error.message || t('sessionDetail.annotationFailed', 'Failed to save annotation'));
    }
  };

  const handleSaveSelfAnnotation = async (annotationData: {
    annotationData: string;
    originalFrameData: string;
    notes?: string;
    frameTimestamp?: number;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.functions.invoke('save-video-annotation', {
        body: {
          videoId: session.id,
          playerId: user?.id,
          isSelfAnnotation: true,
          ...annotationData
        }
      });

      if (error) throw error;

      toast.success(t('sessionDetail.annotationSavedSelf', 'Annotation saved!'));
      fetchAnnotations();
    } catch (error: any) {
      console.error('Error saving annotation:', error);
      toast.error(error.message || t('sessionDetail.annotationFailed', 'Failed to save annotation'));
    }
  };

  const downloadAnnotation = (annotation: any) => {
    const link = document.createElement('a');
    link.href = annotation.annotation_data;
    link.download = `annotation-${new Date(annotation.created_at).toISOString().split('T')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t('sessionDetail.annotationDownloaded', 'Annotation downloaded!'));
  };

  const seekToTimestamp = (timestamp: number) => {
    if (mainVideoRef.current) {
      mainVideoRef.current.currentTime = timestamp;
      mainVideoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      mainVideoRef.current.play();
    }
  };

  const handleToggleShare = async (checked: boolean) => {
    try {
      setSharedWithScouts(checked);
      
      const { error } = await supabase.functions.invoke('update-library-session', {
        body: {
          sessionId: session.id,
          title: session.library_title,
          notes: session.library_notes,
          sharedWithScouts: checked,
        },
      });

      if (error) throw error;

      toast.success(checked ? t('sessionDetail.sharedWithScouts') : t('sessionDetail.unsharedFromScouts', 'Unshared from scouts'));
      onUpdate();
    } catch (error: any) {
      console.error('Error toggling share:', error);
      toast.error(error.message || t('sessionDetail.updateFailed', 'Failed to update sharing'));
      // Revert on error
      setSharedWithScouts(!checked);
    }
  };

  const handleToggleAnalysisPublic = async (checked: boolean) => {
    try {
      setAnalysisPublic(checked);
      
      const { error } = await supabase.functions.invoke('update-library-session', {
        body: {
          sessionId: session.id,
          title: session.library_title,
          notes: session.library_notes,
          sharedWithScouts: session.shared_with_scouts,
          analysisPublic: checked,
        },
      });

      if (error) throw error;

      toast.success(checked ? t('sessionDetail.analysisPublicNow', 'Analysis is now public') : t('sessionDetail.analysisPrivateNow', 'Analysis is now private'));
      onUpdate();
    } catch (error: any) {
      console.error('Error toggling analysis visibility:', error);
      toast.error(error.message || t('sessionDetail.updateFailed', 'Failed to update analysis visibility'));
      // Revert on error
      setAnalysisPublic(!checked);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Get authenticated user for thumbnail upload
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw userError || new Error(t('sessionDetail.mustBeSignedIn', 'You must be signed in to update sessions.'));
      }

      let thumbnailData = {
        webpUrl: undefined as string | undefined,
        sizes: undefined as any,
        blurhash: undefined as string | undefined
      };

      if (customThumbnail) {
        try {
          // Process and optimize thumbnail
          const processed = await processVideoThumbnail(customThumbnail, 0.1);
          
          // Upload WebP version
          thumbnailData.webpUrl = await uploadOptimizedThumbnail(
            processed.webpBlob,
            user.id,
            session.id,
            'webp'
          );
          
          // Upload multiple sizes
          const sizesData = await uploadThumbnailSizes(processed.sizes, user.id, session.id);
          thumbnailData.sizes = sizesData;
          thumbnailData.blurhash = processed.blurhash;
        } catch (thumbnailError: any) {
          console.error('Error uploading thumbnail:', thumbnailError);
          toast.error(`${t('sessionDetail.thumbnailFailed', 'Failed to upload thumbnail')}: ${thumbnailError.message}`);
        }
      }

      const { error } = await supabase.functions.invoke('update-library-session', {
        body: {
          sessionId: session.id,
          title,
          notes,
          sharedWithScouts,
        },
      });

      if (error) throw error;

      if (thumbnailData.webpUrl) {
        const updateData: any = {
          thumbnail_webp_url: thumbnailData.webpUrl,
          thumbnail_sizes: thumbnailData.sizes,
          blurhash: thumbnailData.blurhash,
          thumbnail_url: thumbnailData.webpUrl
        };

        const { error: thumbnailError } = await supabase
          .from('videos')
          .update(updateData)
          .eq('id', session.id)
          .eq('user_id', user.id);

        if (thumbnailError) throw thumbnailError;
      }

      toast.success(t('sessionDetail.sessionUpdated', 'Session updated successfully'));
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating session:', error);
      toast.error(error.message || t('sessionDetail.updateFailed', 'Failed to update session'));
    } finally {
      setSaving(false);
    }
  };

  const aiAnalysis = session.ai_analysis;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-full sm:max-w-[90vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto p-3 sm:p-6 overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('sessionDetail.sessionTitlePlaceholder', 'Session title...')}
              />
            ) : (
              session.library_title || `${session.sport} ${session.module} ${t('sessionDetail.session')}`
            )}
          </DialogTitle>
          <DialogDescription>
            {new Date(session.session_date).toLocaleDateString()} • {session.sport} • {session.module}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">{session.sport}</Badge>
            <Badge variant="outline">{session.module}</Badge>
            {session.shared_with_scouts && (
              <Badge variant="secondary">{t('sessionDetail.sharedWithScouts')}</Badge>
            )}
          </div>

          <Separator />

          {/* Notes Section */}
          <div className="space-y-2">
            <Label>{t('sessionDetail.notes')}</Label>
            {isEditing ? (
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('sessionDetail.notesPlaceholder', 'Add notes about this session...')}
                rows={3}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {session.library_notes || t('sessionDetail.noNotes')}
              </p>
            )}
          </div>

          {/* Thumbnail Upload in Edit Mode */}
          {isEditing && isOwner && (
            <div className="space-y-2">
              <Label>{t('sessionDetail.updateCoverImage')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('sessionDetail.uploadNewCoverImage')}
              </p>
              
              {thumbnailPreview ? (
                <div className="relative">
                  <img 
                    src={thumbnailPreview} 
                    alt={t('sessionDetail.newThumbnail', 'New thumbnail')}
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveThumbnail}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t('sessionDetail.uploadNewThumbnail')}
                </Button>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleThumbnailSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Share Toggle (only for owners) */}
          {isOwner && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="share-toggle">{t('sessionDetail.shareWithScouts')}</Label>
                <Switch
                  id="share-toggle"
                  checked={sharedWithScouts}
                  onCheckedChange={handleToggleShare}
                />
              </div>
              
              {sharedWithScouts && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="analysis-public-toggle">{t('sessionDetail.makeAnalysisPublic')}</Label>
                  <Switch
                    id="analysis-public-toggle"
                    checked={analysisPublic}
                    onCheckedChange={handleToggleAnalysisPublic}
                  />
                </div>
              )}
            </>
          )}

          <Separator />

          {/* AI Analysis - hide from scouts if analysis is private */}
          {aiAnalysis && (isOwner || analysisPublic) && (
            <div className="space-y-4">
              <h3 className="font-semibold">{t('sessionDetail.analysisResults')}</h3>
              
              {aiAnalysis.feedback && (
                <div className="space-y-2">
                  <Label>{t('sessionDetail.feedback')}</Label>
                  <p className="text-sm">{aiAnalysis.feedback}</p>
                </div>
              )}

              {aiAnalysis.drills && aiAnalysis.drills.length > 0 && (
                <div className="space-y-3">
                  <Label>{t('sessionDetail.recommendedDrills')}</Label>
                  {isOwner && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Heart className="h-4 w-4" />
                      {t('videoAnalysis.drillSaveHint')}
                    </p>
                  )}
                  <div className="space-y-4">
                    {aiAnalysis.drills.map((drill: any, index: number) => {
                      const isSaved = savedDrillIds.has(drill.title);
                      return (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold flex-1">{drill.title}</h4>
                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSaveDrill(drill)}
                                disabled={isSaved}
                                className={isSaved ? "text-red-500" : "text-muted-foreground hover:text-red-500"}
                                title={isSaved ? t('vault.drills.saved', 'Saved to Vault') : t('vault.drills.save', 'Save to Vault')}
                              >
                                <Heart className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
                              </Button>
                            )}
                          </div>
                          {drill.purpose && (
                            <p className="text-sm text-muted-foreground">{drill.purpose}</p>
                          )}
                          
                          {drill.steps && drill.steps.length > 0 && (
                            <div className="space-y-1">
                              <Label className="text-xs">{t('sessionDetail.steps')}</Label>
                              <ol className="list-decimal list-inside text-sm space-y-1">
                                {drill.steps.map((step: string, i: number) => (
                                  <li key={i}>{step}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                          
                          {drill.cues && drill.cues.length > 0 && (
                            <div className="space-y-1">
                              <Label className="text-xs">{t('sessionDetail.coachingCues')}</Label>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {drill.cues.map((cue: string, i: number) => (
                                  <li key={i}>{cue}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            {drill.equipment && <span>{t('sessionDetail.equipment')}: {drill.equipment}</span>}
                            {drill.reps_sets && <span>{t('sessionDetail.repsSets')}: {drill.reps_sets}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* The Scorecard Progress Report */}
              {aiAnalysis.scorecard && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-scorecard-dialog" className="text-sm font-medium">
                      {t('sessionDetail.showProgressReport')}
                    </Label>
                    <Switch
                      id="show-scorecard-dialog"
                      checked={showScorecard}
                      onCheckedChange={handleScorecardToggle}
                    />
                  </div>
                  
                  {showScorecard && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <Label className="text-sm font-medium">{t('sessionDetail.scorecardFilter')}</Label>
                        <ToggleGroup 
                          type="single" 
                          value={scorecardFilter} 
                          onValueChange={handleScorecardFilterChange}
                          size="sm"
                        >
                          <ToggleGroupItem value="all" className="text-xs px-3">
                            {t('sessionDetail.filterAll')}
                          </ToggleGroupItem>
                          <ToggleGroupItem value="improvements" className="text-xs px-3">
                            {t('sessionDetail.filterImprovements')}
                          </ToggleGroupItem>
                          <ToggleGroupItem value="regressions" className="text-xs px-3">
                            {t('sessionDetail.filterRegressions')}
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                      <TheScorecard 
                        scorecard={aiAnalysis.scorecard} 
                        currentScore={session.efficiency_score || 0}
                        displayFilter={scorecardFilter}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Show privacy message if analysis exists but is private for scouts */}
          {aiAnalysis && !isOwner && !analysisPublic && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground text-center">
                {t('sessionDetail.analysisPrivate')}
              </p>
            </div>
          )}

          <Separator />

          {/* Annotations Section */}
          {annotations.length > 0 && (
            <div className="space-y-4">
              {/* Coach Annotations */}
              {annotations.filter(a => a.annotator_type === 'scout').length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-lg font-bold text-primary">{t('sessionDetail.coachAnnotations')}</Label>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {annotations.filter(a => a.annotator_type === 'scout').length}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {annotations.filter(a => a.annotator_type === 'scout').map((annotation: any) => (
                      <div key={annotation.id} className="border rounded-lg p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          {annotation.scout?.avatar_url && (
                            <img 
                              src={annotation.scout.avatar_url} 
                              alt={annotation.scout.full_name}
                              className="h-8 w-8 rounded-full"
                            />
                          )}
                          <div>
                            <p className="font-medium text-sm">{annotation.scout?.full_name || t('sessionDetail.coach', 'Coach')}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(annotation.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <img 
                          src={annotation.annotation_data} 
                          alt={t('sessionDetail.annotatedFrame', 'Annotated frame')}
                          className="w-full rounded-md"
                        />
                        {annotation.notes && (
                          <p className="text-sm">{annotation.notes}</p>
                        )}
                        
                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadAnnotation(annotation)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            {t('sessionDetail.download')}
                          </Button>
                          
                          {annotation.frame_timestamp !== null && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => seekToTimestamp(annotation.frame_timestamp)}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              {t('sessionDetail.viewAt')} {annotation.frame_timestamp.toFixed(1)}s
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Player Self-Annotations */}
              {isOwner && annotations.filter(a => a.annotator_type === 'player').length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-lg font-bold">{t('sessionDetail.myAnnotations')}</Label>
                    <Badge variant="outline">
                      {annotations.filter(a => a.annotator_type === 'player').length}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {annotations.filter(a => a.annotator_type === 'player').map((annotation: any) => (
                      <div key={annotation.id} className="border rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {new Date(annotation.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <img 
                          src={annotation.annotation_data} 
                          alt={t('sessionDetail.myAnnotatedFrame', 'My annotated frame')}
                          className="w-full rounded-md"
                        />
                        {annotation.notes && (
                          <p className="text-sm">{annotation.notes}</p>
                        )}
                        
                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadAnnotation(annotation)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            {t('sessionDetail.download')}
                          </Button>
                          
                          {annotation.frame_timestamp !== null && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => seekToTimestamp(annotation.frame_timestamp)}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              {t('sessionDetail.viewAt')} {annotation.frame_timestamp.toFixed(1)}s
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Separator />
            </div>
          )}

          {/* Video Preview */}
          {session.video_url && (
            <div className="space-y-2">
              <Label>{t('sessionDetail.video')}</Label>
              <div className="relative">
                <video
                  ref={mainVideoRef}
                  style={{ display: 'none' }}
                  src={session.video_url}
                  crossOrigin="anonymous"
                />
                <EnhancedVideoPlayer
                  videoSrc={session.video_url}
                  playbackRate={1}
                  videoId={session.id}
                  playerId={session.user_id}
                  isScoutView={isScout && !isOwner}
                  isOwnerView={isOwner}
                  onSaveAnnotation={isOwner ? handleSaveSelfAnnotation : handleSaveAnnotation}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col xs:flex-row gap-2 justify-end">
            {isOwner && (
              <>
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="w-full xs:w-auto">
                      {t('sessionDetail.cancel')}
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="w-full xs:w-auto">
                      {saving ? t('sessionDetail.saving') : t('sessionDetail.saveChanges')}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)} className="w-full xs:w-auto">
                    {t('sessionDetail.editSession')}
                  </Button>
                )}
              </>
            )}
            <Button variant="outline" onClick={onClose} className="w-full xs:w-auto">
              {t('sessionDetail.close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
