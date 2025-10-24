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

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a valid video file");
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setAnalysis(null);
  };

  const handleUploadAndAnalyze = async () => {
    if (!videoFile || !user) return;

    setUploading(true);
    try {
      // Upload video to Supabase Storage (to be implemented)
      // For now, we'll create a placeholder video record
      const { data: videoData, error: videoError } = await supabase
        .from("videos")
        .insert([{
          user_id: user.id,
          sport: sport as "baseball" | "softball",
          module: module as "hitting" | "pitching" | "throwing",
          video_url: "placeholder", // Will be replaced with actual storage URL
          status: "processing" as const,
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
          },
        }
      );

      if (analysisError) throw analysisError;

      setAnalysis(analysisData);
      toast.success("Analysis complete!");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to analyze video");
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
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
                accept="video/*"
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
              <video
                src={videoPreview}
                controls
                className="w-full rounded-lg"
              />
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
                </div>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
