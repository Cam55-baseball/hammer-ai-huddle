import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { uploadScoutLetter, uploadScoutVideo } from "@/lib/uploadHelpers";
import { ArrowLeft, Upload, FileText, Video, Search, GraduationCap } from "lucide-react";

export default function ScoutApplication() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: user?.email || "",
    sport: localStorage.getItem("scoutSport") || "",
    applyingAs: "scout" as "scout" | "coach",
  });

  const [letterFile, setLetterFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: t('common.error'),
        description: t('scoutApplicationPage.errors.notLoggedIn'),
        variant: "destructive",
      });
      return;
    }

    if (!letterFile || !videoFile) {
      toast({
        title: t('scoutApplicationPage.errors.missingFiles'),
        description: t('scoutApplicationPage.errors.missingFilesDesc'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Upload files
      const letterUrl = await uploadScoutLetter(letterFile, user.id);
      const videoUrl = await uploadScoutVideo(videoFile, user.id);

      // Insert application with applying_as field
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
          applying_as: formData.applyingAs,
        });

      if (error) throw error;

      toast({
        title: t('scoutApplicationPage.success.title'),
        description: t('scoutApplicationPage.success.description'),
      });

      navigate("/scout-application-pending");
    } catch (error: any) {
      console.error("Application submission error:", error);
      toast({
        title: t('scoutApplicationPage.errors.submissionFailed'),
        description: error.message || t('scoutApplicationPage.errors.submissionFailedDesc'),
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
          <CardTitle className="text-3xl">{t('scoutApplicationPage.title')}</CardTitle>
          <CardDescription>
            {t('scoutApplicationPage.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('scoutApplicationPage.firstName')} *</Label>
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
                <Label htmlFor="lastName">{t('scoutApplicationPage.lastName')} *</Label>
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
              <Label htmlFor="email">{t('scoutApplicationPage.email')} *</Label>
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
              <Label htmlFor="sport">{t('scoutApplicationPage.sport')}</Label>
              <Input
                id="sport"
                value={formData.sport}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-3">
              <Label>{t('scoutApplication.applyingAs')} *</Label>
              <p className="text-sm text-muted-foreground">
                {t('scoutApplication.applyingAsDesc')}
              </p>
              <RadioGroup 
                value={formData.applyingAs} 
                onValueChange={(value) => setFormData({ ...formData, applyingAs: value as "scout" | "coach" })}
                className="flex gap-6 pt-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="scout" id="apply-scout" />
                  <Label htmlFor="apply-scout" className="flex items-center gap-2 cursor-pointer font-normal">
                    <Search className="h-4 w-4" />
                    {t('scoutApplication.scout')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="coach" id="apply-coach" />
                  <Label htmlFor="apply-coach" className="flex items-center gap-2 cursor-pointer font-normal">
                    <GraduationCap className="h-4 w-4" />
                    {t('scoutApplication.coach')}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="letter">{t('scoutApplicationPage.organizationLetter')} *</Label>
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
                        title: t('scoutApplicationPage.errors.fileTooLarge'),
                        description: t('scoutApplicationPage.errors.letterTooLarge'),
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
              <Label htmlFor="video">{t('scoutApplicationPage.videoSubmission')} *</Label>
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
                        title: t('scoutApplicationPage.errors.fileTooLarge'),
                        description: t('scoutApplicationPage.errors.videoTooLarge'),
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
                {t('scoutApplicationPage.back')}
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    {t('scoutApplicationPage.submitting')}
                  </>
                ) : (
                  t('scoutApplicationPage.submitApplication')
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
