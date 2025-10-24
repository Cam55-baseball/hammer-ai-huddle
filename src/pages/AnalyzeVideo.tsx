import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Upload, Video } from "lucide-react";
import { toast } from "sonner";

export default function AnalyzeVideo() {
  const { module } = useParams<{ module: string }>();
  const [searchParams] = useSearchParams();
  const sport = searchParams.get("sport") || "baseball";
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadSubscription();
  }, [user, navigate]);

  const loadSubscription = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
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
  };

  const handleUploadAndAnalyze = async () => {
    if (!videoFile || !user) return;

    // Check subscription limits
    if (subscription?.videos_remaining <= 0) {
      toast.error("You've used all your free analyses. Please upgrade your plan.");
      navigate('/pricing');
      return;
    }

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
        if (analysisError.message?.includes('429')) {
          toast.error("Rate limit exceeded. Please try again later.");
        } else if (analysisError.message?.includes('402')) {
          toast.error("Payment required. Please add credits to continue.");
        } else {
          throw analysisError;
        }
        return;
      }

      setAnalysis(analysisData);
      await loadSubscription(); // Refresh subscription data
      toast.success("Analysis complete!");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to analyze video");
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          {subscription && (
            <div className="text-sm">
              <span className="text-muted-foreground">Videos remaining: </span>
              <span className="font-bold text-primary">{subscription.videos_remaining}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 capitalize">
            {module} Analysis
          </h1>
          <p className="text-xl text-muted-foreground capitalize">
            {sport} - {module} mechanics evaluation
          </p>
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
                <Button asChild disabled={subscription?.videos_remaining <= 0}>
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
              {subscription?.videos_remaining <= 0 && (
                <div className="mt-4">
                  <p className="text-destructive mb-2">You've used all your free analyses</p>
                  <Button onClick={() => navigate('/pricing')} variant="default">
                    Upgrade Plan
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Video Preview & Analysis */}
        {videoPreview && (
          <div className="space-y-6">
            <Card className="p-6">
              <video
                src={videoPreview}
                controls
                className="w-full rounded-lg"
              />
            </Card>

            {!analyzing && !analysis && (
              <Button
                onClick={handleUploadAndAnalyze}
                disabled={uploading || subscription?.videos_remaining <= 0}
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

            {analysis && (
              <Card className="p-6">
                <h3 className="text-2xl font-bold mb-4">Analysis Results</h3>
                <div className="space-y-4">
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
                  <Button onClick={() => navigate('/dashboard')} className="w-full mt-4">
                    Return to Dashboard
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
