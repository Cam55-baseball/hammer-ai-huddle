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
import { ArrowLeft, Upload, Video, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";

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
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState<any>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<string>(() => {
    return localStorage.getItem('videoPlaybackRate') || '1';
  });
  const videoRef = useRef<HTMLVideoElement>(null);

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

      // Create video record
      const { data: videoData, error: videoError } = await supabase
        .from("videos")
        .insert([{
          user_id: user.id,
          sport: sport as "baseball" | "softball",
          module: module as "hitting" | "pitching" | "throwing",
          video_url: publicUrl,
          status: "uploading" as const,
        }])
        .select()
        .single();

      if (videoError) throw videoError;

      toast.success("Video uploaded! Starting analysis...");
      setUploading(false);
      setAnalyzing(true);
      setCurrentVideoId(videoData.id);

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
      toast.error(error.message || "Failed to analyze video");
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold capitalize">{module} Analysis</h1>
            <p className="text-muted-foreground capitalize">{sport} - {module} mechanics evaluation</p>
          </div>
          <div className="flex gap-2">
            {videoPreview && (
              <Button variant="outline" onClick={handleRemoveVideo}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Video
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        {/* Video Upload Section */}
        {!videoPreview && (
          <Card className="p-12 text-center border-dashed border-2">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-6 rounded-full bg-primary/10">
                <Upload className="h-16 w-16 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold">Upload Your Video</h3>
              <p className="text-muted-foreground max-w-md">
                Upload a video of your {module} technique. Our AI will analyze your mechanics and provide detailed feedback.
              </p>
              <p className="text-sm text-muted-foreground">
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
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Video Preview</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Playback Speed:</span>
                    <Select value={playbackRate} onValueChange={handlePlaybackRateChange}>
                      <SelectTrigger className="w-24">
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

                <video
                  ref={videoRef}
                  src={videoPreview}
                  controls
                  className="w-full rounded-lg"
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
                {uploading ? "Uploading..." : "Analyze Video"}
              </Button>
            )}

            {analyzing && (
              <Card className="p-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-center">
                    Analyzing your technique...
                  </h3>
                  <Progress value={66} className="w-full" />
                  <p className="text-center text-muted-foreground">
                    This may take a minute. Our AI is analyzing your mechanics in detail.
                  </p>
                </div>
              </Card>
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
              <Card className="p-6">
                <h3 className="text-2xl font-bold mb-6">Analysis Results</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold">Efficiency Score</h4>
                    <div className="text-4xl font-bold text-primary">
                      {analysis.efficiency_score}/100
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Feedback</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {analysis.feedback}
                    </p>
                  </div>

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

                  <Button onClick={() => navigate('/dashboard')} className="w-full mt-4">
                    Return to Dashboard
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
