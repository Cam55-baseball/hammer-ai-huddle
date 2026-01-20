import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Video, Check, X, User, GraduationCap, Search } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScoutProfileDialog } from "./ScoutProfileDialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface ScoutApplicationCardProps {
  application: {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    sport: string;
    organization_letter_url: string | null;
    video_submission_url: string | null;
    status: string;
    created_at: string;
    applying_as?: string | null;
  };
  onUpdate: () => void;
}

export function ScoutApplicationCard({ application, onUpdate }: ScoutApplicationCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<'pdf' | 'video' | 'unknown'>('unknown');
  const [viewerTitle, setViewerTitle] = useState('');
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [scoutProfile, setScoutProfile] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<'scout' | 'coach'>(
    (application.applying_as as 'scout' | 'coach') || 'scout'
  );

  const handleAction = async (action: "approve" | "deny") => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("approve-scout-application", {
        body: {
          application_id: application.id,
          action,
          role: selectedRole, // Include selected role
        },
      });

      if (error) throw error;

      const roleLabel = selectedRole === 'coach' 
        ? t('scoutApplication.coach', 'Coach') 
        : t('scoutApplication.scout', 'Scout');

      toast({
        title: action === "approve" 
          ? t('scoutApplication.applicationApprovedAs', { role: roleLabel }) 
          : t('scoutApplication.applicationDenied'),
        description: t('scoutApplication.applicationHasBeen', { 
          name: `${application.first_name} ${application.last_name}`,
          action: action === "approve" ? t('scoutApplication.approved') : t('scoutApplication.denied')
        }),
      });

      onUpdate();
    } catch (error: any) {
      console.error(`Error ${action}ing application:`, error);
      toast({
        title: t('common.error'),
        description: error.message || (action === "approve" ? t('scoutApplication.failedToApprove') : t('scoutApplication.failedToDeny')),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openFile = async (url: string | null, fileType: 'letter' | 'video') => {
    if (!url) return;

    setLoading(true);
    try {
      // Extract path from the URL
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const bucket = fileType === 'letter' ? 'scout-letters' : 'scout-videos';
      const bucketIndex = pathParts.indexOf(bucket);
      const path = pathParts.slice(bucketIndex + 1).join('/');

      console.debug('[ScoutApplicationCard] Opening file', { bucket, path, fileType });

      // Get current session for bearer token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('You must be signed in to download files.');

      // Call the edge function directly with full URL to obtain raw Response
      const resp = await fetch('https://wysikbsjalfvjwqzkihj.functions.supabase.co/download-scout-file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/octet-stream',
        },
        body: JSON.stringify({ bucket, path }),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`Failed to download file (${resp.status}): ${text}`);
      }

      let blob = await resp.blob();

      // Determine content type from header or extension
      const fileName = path.split('/').pop() || '';
      const ext = fileName.split('.').pop()?.toLowerCase();
      const headerType = resp.headers.get('content-type') || undefined;
      const mimeTypes: Record<string, string> = {
        pdf: 'application/pdf',
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        avi: 'video/x-msvideo',
        webm: 'video/webm',
      };
      const fallbackType = ext && mimeTypes[ext] ? mimeTypes[ext] : 'application/octet-stream';
      const finalType = headerType || fallbackType;

      if (!blob.type || (finalType && blob.type !== finalType)) {
        const buf = await blob.arrayBuffer();
        blob = new Blob([buf], { type: finalType });
      }

      const blobUrl = URL.createObjectURL(blob);

      // Set viewer state and open dialog
      setViewerUrl(blobUrl);
      setViewerTitle(fileType === 'letter' ? t('scoutApplication.organizationLetter') : t('scoutApplication.videoSubmission'));
      const vt = ext === 'pdf' ? 'pdf' : (ext && ['mp4', 'mov', 'webm', 'avi'].includes(ext) ? 'video' : 'unknown');
      setViewerType(vt as 'pdf' | 'video' | 'unknown');
      setViewerOpen(true);
    } catch (error: any) {
      console.error('[ScoutApplicationCard] Error downloading file:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('scoutApplication.failedToOpenFile'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', application.user_id)
        .single();

      if (error) throw error;

      setScoutProfile(data);
      setProfileDialogOpen(true);
    } catch (error: any) {
      console.error('[ScoutApplicationCard] Error fetching profile:', error);
      toast({
        title: t('common.error'),
        description: t('scoutApplication.failedToLoadProfile'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-xl font-bold">
                {application.first_name} {application.last_name}
              </h3>
              <p className="text-sm text-muted-foreground">{application.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="capitalize">
                {application.sport}
              </Badge>
              {application.applying_as && (
                <Badge variant="outline" className="capitalize flex items-center gap-1">
                  {application.applying_as === 'coach' ? (
                    <GraduationCap className="h-3 w-3" />
                  ) : (
                    <Search className="h-3 w-3" />
                  )}
                  {application.applying_as === 'coach' 
                    ? t('scoutApplication.applyingAsCoach')
                    : t('scoutApplication.applyingAsScout')
                  }
                </Badge>
              )}
              {application.status !== "pending" && (
                <Badge
                  variant={application.status === "approved" ? "default" : "destructive"}
                  className="capitalize"
                >
                  {application.status}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('scoutApplication.applied')}: {format(new Date(application.created_at), "MMM d, yyyy")}
            </p>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => openFile(application.organization_letter_url, 'letter')}
              disabled={!application.organization_letter_url || loading}
            >
              <FileText className="mr-2 h-4 w-4" />
              {t('scoutApplication.viewOrganizationLetter')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => openFile(application.video_submission_url, 'video')}
              disabled={!application.video_submission_url || loading}
            >
              <Video className="mr-2 h-4 w-4" />
              {t('scoutApplication.viewVideoSubmission')}
            </Button>

            {application.status === "approved" && (
              <Button
                variant="default"
                className="w-full justify-start"
                onClick={handleViewProfile}
                disabled={loading}
              >
                <User className="mr-2 h-4 w-4" />
                {t('scoutApplication.viewProfile')}
              </Button>
            )}

            {application.status === "pending" && (
              <>
                {/* Role selection */}
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <p className="text-sm font-medium mb-2">{t('scoutApplication.approveAs', 'Approve as:')}</p>
                  <RadioGroup 
                    value={selectedRole} 
                    onValueChange={(value) => setSelectedRole(value as 'scout' | 'coach')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="scout" id="role-scout" />
                      <Label htmlFor="role-scout" className="flex items-center gap-1.5 cursor-pointer">
                        <Search className="h-4 w-4" />
                        {t('scoutApplication.scout', 'Scout')}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="coach" id="role-coach" />
                      <Label htmlFor="role-coach" className="flex items-center gap-1.5 cursor-pointer">
                        <GraduationCap className="h-4 w-4" />
                        {t('scoutApplication.coach', 'Coach')}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleAction("approve")}
                    disabled={loading}
                    className="flex-1"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {t('scoutApplication.approve')}
                  </Button>
                  <Button
                    onClick={() => handleAction("deny")}
                    disabled={loading}
                    variant="destructive"
                    className="flex-1"
                  >
                    <X className="mr-2 h-4 w-4" />
                    {t('scoutApplication.deny')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <Dialog
        open={viewerOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (viewerUrl) URL.revokeObjectURL(viewerUrl);
            setViewerUrl(null);
            setViewerOpen(false);
          } else {
            setViewerOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewerTitle}</DialogTitle>
          </DialogHeader>
          <div className="w-full">
            {viewerType === 'pdf' ? (
              <iframe
                src={viewerUrl || ''}
                title={viewerTitle}
                className="w-full h-[70vh] rounded-md border"
              />
            ) : viewerType === 'video' ? (
              <video src={viewerUrl || ''} controls className="w-full max-h-[70vh] rounded-md" />
            ) : (
              <p className="text-sm text-muted-foreground">{t('scoutApplication.previewNotAvailable')}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (viewerUrl) window.open(viewerUrl, '_blank');
              }}
            >
              {t('scoutApplication.openInNewTab')}
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (viewerUrl) {
                  const a = document.createElement('a');
                  a.href = viewerUrl;
                  a.download = viewerTitle.replace(/\s+/g, '-').toLowerCase();
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }
              }}
            >
              {t('scoutApplication.download')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScoutProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        profile={scoutProfile}
      />
    </>
  );
}
