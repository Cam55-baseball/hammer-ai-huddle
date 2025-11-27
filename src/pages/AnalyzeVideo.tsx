import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { ArrowLeft, Upload, Video, Trash2, BookMarked, Home } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SaveToLibraryDialog } from "@/components/SaveToLibraryDialog";
import { EnhancedVideoPlayer } from "@/components/EnhancedVideoPlayer";
import { AnalysisResultSkeleton } from "@/components/skeletons/AnalysisResultSkeleton";
import { branding } from "@/branding";
import { generateVideoThumbnail, uploadVideoThumbnail } from "@/lib/videoHelpers";

export default function AnalyzeVideo() {
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
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<any>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<string>(() => {
    return localStorage.getItem('videoPlaybackRate') || '1';
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [analysisEnabled, setAnalysisEnabled] = useState(true);

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
      toast.error("You don't have access to this module. Please subscribe.");
      navigate("/dashboard", { replace: true });
      return;
    }
  }, [authLoading, subLoading, initialized, user, subscribedModules, module, sport, isOwner, isAdmin, hasAccessForSport, navigate]);

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
      toast.info(`Switched to ${sport} - ${module}. Upload space cleared.`);
    }
  }, [module, sport]);

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
    toast.success("Video removed. Select a new video to analyze.");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a valid video file");
      return;
    }

    if (file.size > 52428800) { // 50MB limit
      toast.error("Video file size must be under 50MB");
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
        toast.error(`Thumbnail generation failed: ${thumbnailError.message || 'Unknown error'}`, {
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
        toast.success("Video uploaded successfully!");
        setUploading(false);
        
        // Automatically open save to library dialog
        setSaveDialogOpen(true);
        return;
      }

      toast.success("Video uploaded! Starting analysis...");
      setUploading(false);
      setAnalyzing(true);

      // Call AI analysis edge function
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-video",
        {
          body: {
            videoId: videoData.id,
            module,
            sport,
            userId: user.id,
          },
        }
      );

      if (analysisError) {
        console.error("Analysis error:", analysisError);
        setAnalysisError(analysisError);
        
        if (analysisError.message?.includes('429') || analysisData?.status === 429) {
          toast.error("Rate limit exceeded. Please try again in a minute.");
        } else if (analysisError.message?.includes('402') || analysisData?.status === 402) {
          toast.error("Payment required. Please add credits to continue.");
        } else {
          toast.error("Analysis failed. Please try again.");
        }
        setAnalyzing(false);
        return;
      }

      setAnalysis(analysisData);
      setAnalysisError(null);
      toast.success("Analysis complete!");
      setAnalyzing(false);
    } catch (error: any) {
      console.error("Error:", error);
      setAnalysisError(error);
      toast.error(error.message || "Failed to process video");
      setAnalyzing(false);
    } finally {
      setUploading(false);
    }
  };

  const handleRetryAnalysis = async () => {
    if (!currentVideoId || !user) return;
    
    setAnalyzing(true);
    setAnalysisError(null);
    
    try {
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-video",
        {
          body: {
            videoId: currentVideoId,
            module,
            sport,
            userId: user.id,
          },
        }
      );

      if (analysisError) {
        console.error("Retry analysis error:", analysisError);
        setAnalysisError(analysisError);
        
        if (analysisError.message?.includes('429') || analysisData?.status === 429) {
          toast.error("Rate limit exceeded. Please try again in a minute.");
        } else if (analysisError.message?.includes('402') || analysisData?.status === 402) {
          toast.error("Payment required. Please add credits to continue.");
        } else {
          toast.error("Analysis failed. Please try again.");
        }
        return;
      }

      setAnalysis(analysisData);
      setAnalysisError(null);
      toast.success("Analysis complete!");
    } catch (error: any) {
      console.error("Retry error:", error);
      setAnalysisError(error);
      toast.error(error.message || "Failed to analyze video");
    } finally {
      setAnalyzing(false);
    }
  };

  if (authLoading || subLoading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Verifying subscription access...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold capitalize">{module} Analysis</h1>
            <p className="text-sm sm:text-base text-muted-foreground capitalize">{sport} - {module} mechanics evaluation</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {videoPreview && (
              <Button variant="outline" size="sm" onClick={handleRemoveVideo} className="flex-1 sm:flex-initial">
                <Trash2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Delete Video</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="flex-1 sm:flex-initial">
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </div>
        </div>

        {/* Video Upload Section */}
        {!videoPreview && (
          <Card className="p-4 sm:p-12 text-center border-dashed border-2">
            <div className="flex flex-col items-center space-y-3 sm:space-y-4">
              <div className="p-4 sm:p-6 rounded-full bg-primary/10">
                <Upload className="h-10 w-10 sm:h-16 sm:w-16 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold">Upload Your Video</h3>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                Upload a video of your {module} technique. Our AI will analyze your mechanics and provide detailed feedback.
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Max file size: 50MB. Supported formats: MP4, MOV, AVI, WebM
              </p>
              <label htmlFor="video-upload">
                <Button asChild>
                  <span>
                    <Video className="h-4 w-4 mr-2" />
                    Select Video
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
        )}

        {/* Video Preview & Analysis */}
        {videoPreview && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                  <h3 className="text-base sm:text-lg font-semibold">Video Preview</h3>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Speed:</span>
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
                      <p className="font-medium capitalize">{sport} - {module} Analysis</p>
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
                      Enable AI Analysis
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {analysisEnabled 
                        ? "Video will be analyzed for technique feedback and drill recommendations" 
                        : "Video will be uploaded without analysis (saves analysis credits)"}
                    </p>
                  </div>
                  <Switch
                    id="enable-analysis"
                    checked={analysisEnabled}
                    onCheckedChange={setAnalysisEnabled}
                  />
                </div>


                <EnhancedVideoPlayer
                  videoSrc={videoPreview}
                  playbackRate={parseFloat(playbackRate)}
                  videoId={currentVideoId || undefined}
                  sport={sport as 'baseball' | 'softball'}
                  module={module as 'hitting' | 'pitching' | 'throwing'}
                />
              </div>
            </Card>

            {!analyzing && !analysis && (
              <Button
                onClick={handleUploadAndAnalyze}
                disabled={uploading}
                size="lg"
                className="w-full"
              >
                {uploading ? (
                  "Uploading..."
                ) : analysisEnabled ? (
                  <>
                    <Upload className="h-4 w-4 sm:mr-2" />
                    <span className="hidden xs:inline">Upload & Analyze Video</span>
                    <span className="xs:hidden">Analyze</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 sm:mr-2" />
                    <span className="hidden xs:inline">Upload Video</span>
                    <span className="xs:hidden">Upload</span>
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
                      <h3 className="text-xl font-semibold">Video Uploaded!</h3>
                      <p className="text-sm text-muted-foreground">
                        Your video has been uploaded without analysis
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground">
                    Your video is ready to be saved to your Players Club library. You can add a title, 
                    notes, and choose whether to share it with scouts.
                  </p>
                  
                  <div className="flex flex-col xs:flex-row gap-2 max-w-full overflow-x-hidden">
                    <Button onClick={() => setSaveDialogOpen(true)} className="w-full xs:flex-1">
                      <BookMarked className="h-4 w-4 sm:mr-2" />
                      <span className="hidden xs:inline">Save to Players Club</span>
                      <span className="xs:hidden">Save to Library</span>
                    </Button>
                    <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full xs:flex-1">
                      <Home className="h-4 w-4 xs:hidden" />
                      <span className="hidden xs:inline">Return to Dashboard</span>
                      <span className="xs:hidden">Dashboard</span>
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
                <h3 className="text-xl font-semibold text-destructive mb-4">Analysis Failed</h3>
                <p className="text-muted-foreground mb-4">
                  {analysisError.message?.includes('429') || analysisError.status === 429
                    ? "Rate limit exceeded. Please wait a minute and try again."
                    : analysisError.message?.includes('402') || analysisError.status === 402
                    ? "Payment required. Please add credits to your workspace to continue."
                    : "An error occurred during analysis. Please try again."}
                </p>
                <Button onClick={handleRetryAnalysis} className="w-full">
                  Retry Analysis
                </Button>
              </Card>
            )}

            {analysis && (
              <Card className="p-4 sm:p-6">
                <h3 className="text-2xl font-bold mb-6">Analysis Results</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold">Efficiency Score</h4>
                    <div className="text-4xl font-bold text-primary">
                      {analysis.efficiency_score}/100
                    </div>
                  </div>

                  {/* Summary - Moved here for prominence */}
                  {analysis.summary && analysis.summary.length > 0 && (
                    <div className="p-4 bg-muted/50 rounded-lg border border-border">
                      <h4 className="text-lg font-semibold mb-3">Key Findings</h4>
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
                    <h4 className="text-lg font-semibold mb-3">Detailed Analysis</h4>
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
                            What You're Doing Well
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
                      <h4 className="text-lg font-semibold mb-4">Recommended Drills</h4>
                      <div className="space-y-4">
                        {analysis.drills.map((drill: any, index: number) => (
                          <Card key={index} className="p-4 bg-muted/50">
                            <h5 className="font-semibold text-base mb-1">{drill.title}</h5>
                            <p className="text-sm text-muted-foreground mb-3">{drill.purpose}</p>
                            
                            <div className="space-y-2 mb-3">
                              <p className="text-sm font-medium">Steps:</p>
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
                                <p className="text-xs font-medium mb-1">Coaching Cues:</p>
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
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground/70 leading-relaxed">
                      <strong>Disclaimer:</strong> {branding.appName} waives all liability for any injuries that may occur from performing training techniques demonstrated or recommended through this platform. Users assume full responsibility for their safety and should consult with qualified professionals before beginning any training program.
                    </p>
                  </div>

                  <div className="flex flex-col xs:flex-row gap-2 max-w-full overflow-x-hidden">
                    <Button onClick={() => setSaveDialogOpen(true)} variant="outline" className="w-full xs:flex-1">
                      <BookMarked className="h-4 w-4 sm:mr-2" />
                      <span className="hidden xs:inline">Save to Players Club</span>
                      <span className="xs:hidden">Save to Library</span>
                    </Button>
                    <Button onClick={() => navigate('/dashboard')} className="w-full xs:flex-1">
                      <Home className="h-4 w-4 xs:hidden" />
                      <span className="hidden xs:inline">Return to Dashboard</span>
                      <span className="xs:hidden">Dashboard</span>
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
