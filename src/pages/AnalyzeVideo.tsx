import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowLeft, Upload, Video, Trash2, BookMarked, Home, Heart, Target } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SaveToLibraryDialog } from "@/components/SaveToLibraryDialog";
import { RealTimePlaybackCard } from "@/components/RealTimePlaybackCard";
import { EnhancedVideoPlayer } from "@/components/EnhancedVideoPlayer";
import { AnalysisResultSkeleton } from "@/components/skeletons/AnalysisResultSkeleton";
import { TheScorecard } from "@/components/TheScorecard";
import { branding } from "@/branding";
import { generateVideoThumbnail, uploadVideoThumbnail } from "@/lib/videoHelpers";
import { extractKeyFrames, calculateLandingFrameIndex } from "@/lib/frameExtraction";
import { useVault } from "@/hooks/useVault";

export default function AnalyzeVideo() {
  const { t } = useTranslation();
  const { module } = useParams<{ module: string }>();
  const [searchParams] = useSearchParams();
  const sport = searchParams.get("sport") || (localStorage.getItem('selectedSport') as string) || "baseball";
  const { user, loading: authLoading } = useAuth();
  const { modules: subscribedModules, loading: subLoading, initialized, refetch, hasAccessForSport } = useSubscription();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{
    efficiency_score: number;
    summary?: string[];
    feedback: string;
    positives?: string[];
    drills: Array<{
      title: string;
      purpose: string;
      steps: string[];
      reps_sets: string;
      equipment: string;
      cues?: string[];
    }>;
    scorecard?: {
      improvements: Array<{ area: string; description: string; trend?: string }>;
      regressions: Array<{ area: string; description: string; trend?: string }>;
      neutral: Array<{ area: string; description: string }>;
      overall_trend: string;
      score_trend?: {
        direction: "improving" | "declining" | "stable";
        average_change: number;
        comparison_to_first: number;
      };
      is_first_analysis: boolean;
      historical_scores?: number[];
    };
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<any>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<string>(() => {
    return localStorage.getItem('videoPlaybackRate') || '1';
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [analysisEnabled, setAnalysisEnabled] = useState(true);
  const [showScorecard, setShowScorecard] = useState<boolean>(() => {
    return localStorage.getItem('showProgressReport') !== 'false';
  });
  const [scorecardFilter, setScorecardFilter] = useState<'all' | 'improvements' | 'regressions'>(() => {
    const saved = localStorage.getItem('scorecardDisplayFilter');
    return (saved === 'improvements' || saved === 'regressions') ? saved : 'all';
  });
  const [savedDrillIds, setSavedDrillIds] = useState<Set<string>>(new Set());
  const [landingTime, setLandingTime] = useState<number | null>(null);
  const [extractingFrames, setExtractingFrames] = useState(false);
  const { saveDrill, savedDrills } = useVault();

  // Track which drills are already saved
  useEffect(() => {
    if (savedDrills && analysis?.drills) {
      const saved = new Set(
        savedDrills
          .filter(d => d.module_origin === module && d.sport === sport)
          .map(d => d.drill_name)
      );
      setSavedDrillIds(saved);
    }
  }, [savedDrills, analysis?.drills, module, sport]);

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
      module_origin: module || '',
      sport: sport,
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

  // Force fresh subscription check on page load
  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    // Wait for auth, subscription, and initialization to complete
    if (authLoading || subLoading || !initialized) {
      return;
    }
    
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    
    // Guard against missing module parameter
    if (!module) {
      navigate("/dashboard", { replace: true });
      return;
    }
    
    const isOwnerOrAdmin = isOwner || isAdmin;
    const sportModuleKey = `${sport}_${module}`;
    const hasAccess = hasAccessForSport(module as string, sport, isOwnerOrAdmin);
    
    console.log('AnalyzeVideo - Current subscribed modules:', subscribedModules);
    console.log('AnalyzeVideo - Checking access for:', sportModuleKey);
    console.log('AnalyzeVideo - Is Owner/Admin:', isOwnerOrAdmin);
    console.log('AnalyzeVideo - Has Access:', hasAccess);
    
    // Check if user has access to this module
    if (!hasAccess) {
      toast.error(t('errors.noModuleAccess', "You don't have access to this module. Please subscribe."));
      navigate("/dashboard", { replace: true });
      return;
    }
  }, [authLoading, subLoading, initialized, user, subscribedModules, module, sport, isOwner, isAdmin, hasAccessForSport, navigate, t]);

  // Clean upload space when module or sport changes
  useEffect(() => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoFile(null);
    setVideoPreview(null);
    setAnalysis(null);
    setAnalysisError(null);
    setCurrentVideoId(null);
    setAnalysisEnabled(true);
    if (module && sport) {
      toast.info(t('videoAnalysis.switchedModule', `Switched to ${sport} - ${module}. Upload space cleared.`));
    }
  }, [module, sport, t]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = parseFloat(playbackRate);
    }
  }, [playbackRate]);

  const handlePlaybackRateChange = (rate: string) => {
    setPlaybackRate(rate);
    localStorage.setItem('videoPlaybackRate', rate);
  };

  const handleRemoveVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoFile(null);
    setVideoPreview(null);
    setAnalysis(null);
    setAnalysisError(null);
    setCurrentVideoId(null);
    setAnalysisEnabled(true);
    toast.success(t('videoAnalysis.videoRemoved', "Video removed. Select a new video to analyze."));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error(t('videoAnalysis.invalidVideoFile', "Please select a valid video file"));
      return;
    }

    if (file.size > 52428800) { // 50MB limit
      toast.error(t('videoAnalysis.fileTooLarge', "Video file size must be under 50MB"));
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setAnalysis(null);
    setAnalysisError(null);
    setCurrentVideoId(null);
  };

  const handleUploadAndAnalyze = async () => {
    if (!videoFile || !user) return;

    setUploading(true);
    
    // ===== EXTRACT KEY FRAMES FOR AI ANALYSIS =====
    let frames: string[] = [];
    let landingFrameIndex: number | null = null;
    
    if (analysisEnabled) {
      try {
        setExtractingFrames(true);
        toast.info(t('videoAnalysis.extractingFrames', "Extracting key frames for analysis..."));
        
        frames = await extractKeyFrames(videoFile, landingTime);
        
        if (frames.length < 3) {
          throw new Error("Could not extract enough frames for accurate analysis");
        }
        
        // Calculate landing frame index if user marked landing
        if (landingTime != null) {
          landingFrameIndex = calculateLandingFrameIndex(landingTime);
          console.log('[ANALYSIS] Using landing frame index:', landingFrameIndex);
        }
        
        console.log(`[ANALYSIS] Successfully extracted ${frames.length} frames for analysis`);
        setExtractingFrames(false);
      } catch (frameError: any) {
        console.error('[ANALYSIS] Frame extraction failed:', frameError);
        setExtractingFrames(false);
        toast.error(t('videoAnalysis.frameExtractionFailed', "Failed to extract video frames. Please try a different video format or browser."));
        setUploading(false);
        return;
      }
    }
    // ===== END FRAME EXTRACTION =====
    
    try {
      // Upload video to storage
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, videoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      // Generate and upload thumbnail
      let thumbnailUrl: string | null = null;
      try {
        console.log('=== THUMBNAIL GENERATION START ===');
        console.log('Video file:', {
          name: videoFile.name,
          size: videoFile.size,
          type: videoFile.type
        });
        
        const thumbnailBlob = await generateVideoThumbnail(videoFile, 0.1);
        console.log('Thumbnail generated successfully, uploading...');
        
        thumbnailUrl = await uploadVideoThumbnail(thumbnailBlob, user.id, fileName);
        console.log('Thumbnail uploaded successfully:', thumbnailUrl);
        console.log('=== THUMBNAIL GENERATION SUCCESS ===');
      } catch (thumbnailError: any) {
        console.error('=== THUMBNAIL GENERATION FAILED ===');
        console.error('Error details:', thumbnailError);
        console.error('Error message:', thumbnailError.message);
        console.error('Error stack:', thumbnailError.stack);
        
        // Show detailed error to user
        toast.error(`${t('videoAnalysis.thumbnailFailed', 'Thumbnail generation failed')}: ${thumbnailError.message || 'Unknown error'}`, {
          duration: 5000
        });
      }

      // Create video record with appropriate status
      const { data: videoData, error: videoError } = await supabase
        .from("videos")
        .insert([{
          user_id: user.id,
          sport: sport as "baseball" | "softball",
          module: module as "hitting" | "pitching" | "throwing",
          video_url: publicUrl,
          thumbnail_url: thumbnailUrl,
          status: analysisEnabled ? "uploading" : "completed",
        }])
        .select()
        .single();

      if (videoError) throw videoError;

      setCurrentVideoId(videoData.id);
      
      // Branch based on analysis toggle
      if (!analysisEnabled) {
        // No analysis - just upload and prompt to save to library
        toast.success(t('videoAnalysis.uploadSuccess', "Video uploaded successfully!"));
        setUploading(false);
        
        // Automatically open save to library dialog
        setSaveDialogOpen(true);
        return;
      }

      toast.success(t('videoAnalysis.uploadedStartingAnalysis', "Video uploaded! Starting analysis..."));
      setUploading(false);
      setAnalyzing(true);

      // Call AI analysis edge function with frames for multimodal analysis
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-video",
        {
          body: {
            videoId: videoData.id,
            module,
            sport,
            userId: user.id,
            language: i18n.language,
            frames, // Include extracted frames for visual analysis
            landingFrameIndex, // Include landing frame index if user marked it
          },
        }
      );

      if (analysisError) {
        console.error("Analysis error:", analysisError);
        setAnalysisError(analysisError);
        
        if (analysisError.message?.includes('429') || analysisData?.status === 429) {
          toast.error(t('videoAnalysis.rateLimitError'));
        } else if (analysisError.message?.includes('402') || analysisData?.status === 402) {
          toast.error(t('videoAnalysis.paymentRequiredError'));
        } else {
          toast.error(t('videoAnalysis.genericAnalysisError'));
        }
        setAnalyzing(false);
        return;
      }

      setAnalysis(analysisData);
      setAnalysisError(null);
      toast.success(t('videoAnalysis.analysisComplete', "Analysis complete!"));
      setAnalyzing(false);
    } catch (error: any) {
      console.error("Error:", error);
      setAnalysisError(error);
      toast.error(error.message || t('videoAnalysis.processingFailed', "Failed to process video"));
      setAnalyzing(false);
    } finally {
      setUploading(false);
      setExtractingFrames(false);
    }
  };

  const handleRetryAnalysis = async () => {
    if (!currentVideoId || !user) return;
    
    // Guard: Need video file to re-extract frames
    if (!videoFile) {
      toast.error(t('videoAnalysis.videoFileLost', "Video file not available. Please re-upload the video to retry analysis."));
      return;
    }
    
    setAnalyzing(true);
    setAnalysisError(null);
    
    // Re-extract frames for retry
    let frames: string[] = [];
    let landingFrameIndex: number | null = null;
    
    try {
      setExtractingFrames(true);
      toast.info(t('videoAnalysis.extractingFrames', "Extracting key frames for analysis..."));
      
      frames = await extractKeyFrames(videoFile, landingTime);
      
      if (frames.length < 3) {
        throw new Error("Could not extract enough frames for accurate analysis");
      }
      
      // Calculate landing frame index if user marked landing
      if (landingTime != null) {
        landingFrameIndex = calculateLandingFrameIndex(landingTime);
        console.log('[RETRY ANALYSIS] Using landing frame index:', landingFrameIndex);
      }
      
      console.log(`[RETRY ANALYSIS] Successfully extracted ${frames.length} frames for analysis`);
      setExtractingFrames(false);
    } catch (frameError: any) {
      console.error('[RETRY ANALYSIS] Frame extraction failed:', frameError);
      setExtractingFrames(false);
      toast.error(t('videoAnalysis.frameExtractionFailed', "Failed to extract video frames. Please try a different video format or browser."));
      setAnalyzing(false);
      return;
    }
    
    try {
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-video",
        {
          body: {
            videoId: currentVideoId,
            module,
            sport,
            userId: user.id,
            language: i18n.language,
            frames, // Include re-extracted frames
            landingFrameIndex, // Include landing frame index if user marked it
          },
        }
      );

      if (analysisError) {
        console.error("Retry analysis error:", analysisError);
        setAnalysisError(analysisError);
        
        if (analysisError.message?.includes('429') || analysisData?.status === 429) {
          toast.error(t('videoAnalysis.rateLimitError'));
        } else if (analysisError.message?.includes('402') || analysisData?.status === 402) {
          toast.error(t('videoAnalysis.paymentRequiredError'));
        } else {
          toast.error(t('videoAnalysis.genericAnalysisError'));
        }
        return;
      }

      setAnalysis(analysisData);
      setAnalysisError(null);
      toast.success(t('videoAnalysis.analysisComplete', "Analysis complete!"));
    } catch (error: any) {
      console.error("Retry error:", error);
      setAnalysisError(error);
      toast.error(error.message || t('videoAnalysis.analysisFailed', "Failed to analyze video"));
    } finally {
      setAnalyzing(false);
      setExtractingFrames(false);
    }
  };

  if (authLoading || subLoading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">{t('videoAnalysis.verifyingAccess')}</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full analysis-zoomable">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold capitalize">{module} {t('videoAnalysis.analysis')}</h1>
            <p className="text-sm sm:text-base text-muted-foreground capitalize">{sport} - {module} {t('videoAnalysis.mechanicsEvaluation', 'mechanics evaluation')}</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {videoPreview && (
              <Button variant="outline" size="sm" onClick={handleRemoveVideo} className="flex-1 sm:flex-initial">
                <Trash2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('videoAnalysis.deleteVideo')}</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="flex-1 sm:flex-initial">
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('videoAnalysis.back')}</span>
            </Button>
          </div>
        </div>

        {/* Video Upload Section */}
        {!videoPreview && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Upload Card */}
            <Card className="p-4 sm:p-6 text-center border-dashed border-2">
              <div className="flex flex-col items-center space-y-3">
                <div className="p-3 sm:p-4 rounded-full bg-primary/10">
                  <Upload className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold">{t('videoAnalysis.uploadYourVideo')}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xs">
                  {t('videoAnalysis.uploadDescription', { module })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('videoAnalysis.maxFileSize')}
                </p>
                <label htmlFor="video-upload">
                  <Button asChild size="sm">
                    <span>
                      <Video className="h-4 w-4 mr-2" />
                      {t('videoAnalysis.selectVideo')}
                    </span>
                  </Button>
                </label>
                <input
                  id="video-upload"
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </Card>

            {/* Real-Time Playback Card */}
            <RealTimePlaybackCard module={module || ''} sport={sport} />
          </div>
        )}

        {/* Video Preview & Analysis */}
        {videoPreview && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                  <h3 className="text-base sm:text-lg font-semibold">{t('videoAnalysis.videoPreview')}</h3>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{t('videoAnalysis.speed')}</span>
                    <Select value={playbackRate} onValueChange={handlePlaybackRateChange}>
                      <SelectTrigger className="w-20 sm:w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.25">0.25x</SelectItem>
                        <SelectItem value="0.5">0.5x</SelectItem>
                        <SelectItem value="0.75">0.75x</SelectItem>
                        <SelectItem value="1">1.0x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* File metadata and analysis context */}
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium capitalize">{sport} - {module} {t('videoAnalysis.analysis')}</p>
                      {videoFile && (
                        <p className="text-muted-foreground text-xs">
                          {videoFile.name} • {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Analysis Toggle */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable-analysis" className="text-sm font-medium">
                      {t('videoAnalysis.enableAIAnalysis')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {analysisEnabled 
                        ? t('videoAnalysis.analysisEnabledDescription')
                        : t('videoAnalysis.analysisDisabledDescription')}
                    </p>
                  </div>
                  <Switch
                    id="enable-analysis"
                    checked={analysisEnabled}
                    onCheckedChange={setAnalysisEnabled}
                  />
                </div>

                {/* Landing Marker for Pitching/Throwing */}
                {analysisEnabled && (module === 'pitching' || module === 'throwing') && (
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-dashed">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        {t('videoAnalysis.markLanding', 'Mark Landing Moment')}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {landingTime != null 
                          ? t('videoAnalysis.landingMarked', `Landing marked at ${landingTime.toFixed(2)}s`)
                          : t('videoAnalysis.landingHint', 'Optional: Pause at front foot landing, then click "Mark Landing"')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {landingTime != null && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setLandingTime(null)}
                          className="text-muted-foreground"
                        >
                          {t('common.clear', 'Clear')}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <EnhancedVideoPlayer
                  videoSrc={videoPreview}
                  playbackRate={parseFloat(playbackRate)}
                  onMarkLanding={analysisEnabled && (module === 'pitching' || module === 'throwing') ? setLandingTime : undefined}
                  landingTime={landingTime}
                />
              </div>
            </Card>

            {!analyzing && !analysis && (
              <Button
                onClick={handleUploadAndAnalyze}
                disabled={uploading || extractingFrames}
                size="lg"
                className="w-full"
              >
                {extractingFrames ? (
                  t('videoAnalysis.extractingFrames', "Extracting frames...")
                ) : uploading ? (
                  t('videoAnalysis.uploading')
                ) : analysisEnabled ? (
                  <>
                    <Upload className="h-4 w-4 sm:mr-2" />
                    <span className="hidden xs:inline">{t('videoAnalysis.uploadAndAnalyze')}</span>
                    <span className="xs:hidden">{t('videoAnalysis.uploadAndAnalyze')}</span>
                  </>
                ) : (
                  <>
                    <BookMarked className="h-4 w-4 sm:mr-2" />
                    <span className="hidden xs:inline">{t('videoAnalysis.uploadToLibrary')}</span>
                    <span className="xs:hidden">{t('videoAnalysis.uploadToLibrary')}</span>
                  </>
                )}
              </Button>
            )}

            {/* Non-analyzed upload success message */}
            {currentVideoId && !analysisEnabled && !analyzing && !analysis && !uploading && (
              <Card className="p-4 sm:p-6 border-primary">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <BookMarked className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{t('videoAnalysis.videoUploaded')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t('videoAnalysis.uploadedWithoutAnalysis')}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground">
                    {t('videoAnalysis.readyToSave')}
                  </p>
                  
                  <div className="flex flex-col xs:flex-row gap-2 max-w-full overflow-x-hidden">
                    <Button onClick={() => setSaveDialogOpen(true)} className="w-full xs:flex-1">
                      <BookMarked className="h-4 w-4 sm:mr-2" />
                      <span className="hidden xs:inline">{t('videoAnalysis.saveToLibrary')}</span>
                      <span className="xs:hidden">{t('videoAnalysis.saveToLibrary')}</span>
                    </Button>
                    <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full xs:flex-1">
                      <Home className="h-4 w-4 xs:hidden" />
                      <span className="hidden xs:inline">{t('videoAnalysis.returnToDashboard')}</span>
                      <span className="xs:hidden">{t('navigation.dashboard')}</span>
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {analyzing && (
              <AnalysisResultSkeleton />
            )}

            {analysisError && !analyzing && (
              <Card className="p-6 border-destructive">
                <h3 className="text-xl font-semibold text-destructive mb-4">{t('videoAnalysis.analysisFailed')}</h3>
                <p className="text-muted-foreground mb-4">
                  {analysisError.message?.includes('429') || analysisError.status === 429
                    ? t('videoAnalysis.rateLimitError')
                    : analysisError.message?.includes('402') || analysisError.status === 402
                    ? t('videoAnalysis.paymentRequiredError')
                    : t('videoAnalysis.genericAnalysisError')}
                </p>
                <Button onClick={handleRetryAnalysis} className="w-full">
                  {t('videoAnalysis.retryAnalysis')}
                </Button>
              </Card>
            )}

            {analysis && (
              <Card className="p-4 sm:p-6">
                <h3 className="text-2xl font-bold mb-6">{t('videoAnalysis.analysisResults')}</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold">{t('videoAnalysis.efficiencyScore')}</h4>
                    <div className="text-4xl font-bold text-primary">
                      {analysis.efficiency_score}/100
                    </div>
                  </div>

                  {/* Summary - Moved here for prominence */}
                  {analysis.summary && analysis.summary.length > 0 && (
                    <div className="p-4 bg-muted/50 rounded-lg border border-border">
                      <h4 className="text-lg font-semibold mb-3">{t('videoAnalysis.keyFindings')}</h4>
                      <ul className="space-y-2">
                        {analysis.summary.map((point: string, index: number) => (
                          <li 
                            key={index}
                            className="flex items-start gap-2"
                          >
                            <span className="text-primary mt-1 text-lg">•</span>
                            <span className="text-base">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-lg font-semibold mb-3">{t('videoAnalysis.detailedAnalysis')}</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {analysis.feedback}
                    </p>
                  </div>

                  {/* Positives Section */}
                  {analysis.positives && analysis.positives.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-950/30 border-2 border-green-500 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <svg 
                            className="h-6 w-6 text-green-600 dark:text-green-400" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-2">
                            {t('videoAnalysis.whatYoureDoingWell')}
                          </h4>
                          <ul className="space-y-2">
                            {analysis.positives.map((positive: string, index: number) => (
                              <li 
                                key={index} 
                                className="text-sm text-green-900 dark:text-green-100 flex items-start gap-2"
                              >
                                <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                                <span>{positive}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {analysis.drills && analysis.drills.length > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="text-lg font-semibold mb-2">{t('videoAnalysis.recommendedDrills')}</h4>
                      <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5">
                        <Heart className="h-4 w-4" />
                        {t('videoAnalysis.drillSaveHint')}
                      </p>
                      <div className="space-y-4">
                        {analysis.drills.map((drill: any, index: number) => {
                          const isSaved = savedDrillIds.has(drill.title);
                          return (
                            <Card key={index} className="p-4 bg-muted/50">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h5 className="font-semibold text-base mb-1">{drill.title}</h5>
                                  <p className="text-sm text-muted-foreground mb-3">{drill.purpose}</p>
                                </div>
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
                              </div>
                              
                              <div className="space-y-2 mb-3">
                                <p className="text-sm font-medium">{t('videoAnalysis.steps')}</p>
                                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                                  {drill.steps?.map((step: string, stepIndex: number) => (
                                    <li key={stepIndex}>{step}</li>
                                  ))}
                                </ol>
                              </div>

                              <div className="flex flex-wrap gap-2 text-xs">
                                <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                                  {drill.reps_sets}
                                </span>
                                <span className="bg-secondary/50 text-secondary-foreground px-2 py-1 rounded">
                                  {drill.equipment}
                                </span>
                              </div>

                              {drill.cues && drill.cues.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-border/50">
                                  <p className="text-xs font-medium mb-1">{t('videoAnalysis.coachingCues')}</p>
                                  <div className="flex flex-wrap gap-1">
                                    {drill.cues.map((cue: string, cueIndex: number) => (
                                      <span key={cueIndex} className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded">
                                        {cue}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* The Scorecard - Progress Report */}
                  {analysis.scorecard && (
                    <div className="pt-4 border-t space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="show-scorecard" className="text-sm font-medium">
                            {t('videoAnalysis.showProgressReport')}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {t('videoAnalysis.progressReportDescription')}
                          </p>
                        </div>
                        <Switch
                          id="show-scorecard"
                          checked={showScorecard}
                          onCheckedChange={handleScorecardToggle}
                        />
                      </div>
                      
                      {showScorecard && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <Label className="text-sm font-medium">{t('videoAnalysis.scorecardFilter')}</Label>
                            <ToggleGroup 
                              type="single" 
                              value={scorecardFilter} 
                              onValueChange={handleScorecardFilterChange}
                              size="sm"
                            >
                              <ToggleGroupItem value="all" className="text-xs px-3">
                                {t('videoAnalysis.filterAll')}
                              </ToggleGroupItem>
                              <ToggleGroupItem value="improvements" className="text-xs px-3">
                                {t('videoAnalysis.filterImprovements')}
                              </ToggleGroupItem>
                              <ToggleGroupItem value="regressions" className="text-xs px-3">
                                {t('videoAnalysis.filterRegressions')}
                              </ToggleGroupItem>
                            </ToggleGroup>
                          </div>
                          <TheScorecard 
                            scorecard={analysis.scorecard} 
                            currentScore={analysis.efficiency_score}
                            displayFilter={scorecardFilter}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground/70 leading-relaxed">
                      <strong>{t('videoAnalysis.disclaimer')}</strong> {branding.appName} waives all liability for any injuries that may occur from performing training techniques demonstrated or recommended through this platform. Users assume full responsibility for their safety and should consult with qualified professionals before beginning any training program.
                    </p>
                  </div>

                  <div className="flex flex-col xs:flex-row gap-2 max-w-full overflow-x-hidden">
                    <Button onClick={() => setSaveDialogOpen(true)} variant="outline" className="w-full xs:flex-1">
                      <BookMarked className="h-4 w-4 sm:mr-2" />
                      <span className="hidden xs:inline">{t('videoAnalysis.saveToLibrary')}</span>
                      <span className="xs:hidden">{t('videoAnalysis.saveToLibrary')}</span>
                    </Button>
                    <Button onClick={() => navigate('/dashboard')} className="w-full xs:flex-1">
                      <Home className="h-4 w-4 xs:hidden" />
                      <span className="hidden xs:inline">{t('videoAnalysis.returnToDashboard')}</span>
                      <span className="xs:hidden">{t('navigation.dashboard')}</span>
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Save to Library Dialog */}
      {currentVideoId && (
        <SaveToLibraryDialog
          open={saveDialogOpen}
          onClose={() => setSaveDialogOpen(false)}
          videoId={currentVideoId}
          sport={sport}
          module={module || ''}
        />
      )}
    </DashboardLayout>
  );
}
