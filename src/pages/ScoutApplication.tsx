import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { uploadScoutLetter, uploadScoutVideo } from "@/lib/uploadHelpers";
import { ArrowLeft, Upload, FileText, Video } from "lucide-react";

export default function ScoutApplication() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: user?.email || "",
    sport: localStorage.getItem("scoutSport") || "",
  });

  const [letterFile, setLetterFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to submit an application",
        variant: "destructive",
      });
      return;
    }

    if (!letterFile || !videoFile) {
      toast({
        title: "Missing Files",
        description: "Please upload both an organization letter and video submission",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Upload files
      const letterUrl = await uploadScoutLetter(letterFile, user.id);
      const videoUrl = await uploadScoutVideo(videoFile, user.id);

      // Insert application
      const { error } = await supabase
        .from("scout_applications")
        .insert({
          user_id: user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          sport: formData.sport,
          organization_letter_url: letterUrl,
          video_submission_url: videoUrl,
        });

      if (error) throw error;

      toast({
        title: "Application Submitted!",
        description: "Your application has been sent for review",
      });

      navigate("/scout-application-pending");
    } catch (error: any) {
      console.error("Application submission error:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl">Scout/Coach Application</CardTitle>
          <CardDescription>
            Submit your credentials for owner review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  required
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sport">Sport</Label>
              <Input
                id="sport"
                value={formData.sport}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="letter">Organization Letter * (PDF, JPG, PNG - Max 5MB)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="letter"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.size > 5 * 1024 * 1024) {
                      toast({
                        title: "File Too Large",
                        description: "Letter must be under 5MB",
                        variant: "destructive",
                      });
                      e.target.value = "";
                      return;
                    }
                    setLetterFile(file || null);
                  }}
                />
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="video">Video Submission * (MP4, MOV, AVI - Max 50MB)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="video"
                  type="file"
                  accept=".mp4,.mov,.avi"
                  required
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.size > 50 * 1024 * 1024) {
                      toast({
                        title: "File Too Large",
                        description: "Video must be under 50MB",
                        variant: "destructive",
                      });
                      e.target.value = "";
                      return;
                    }
                    setVideoFile(file || null);
                  }}
                />
                <Video className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/select-sport-scout")}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
