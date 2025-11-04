import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Video, Check, X, User } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScoutProfileDialog } from "./ScoutProfileDialog";
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
  };
  onUpdate: () => void;
}

export function ScoutApplicationCard({ application, onUpdate }: ScoutApplicationCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<'pdf' | 'video' | 'unknown'>('unknown');
  const [viewerTitle, setViewerTitle] = useState('');
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [scoutProfile, setScoutProfile] = useState<any>(null);

  const handleAction = async (action: "approve" | "deny") => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("approve-scout-application", {
        body: {
          application_id: application.id,
          action,
        },
      });

      if (error) throw error;

      toast({
        title: action === "approve" ? "Application Approved" : "Application Denied",
        description: `${application.first_name} ${application.last_name}'s application has been ${action}d`,
      });

      onUpdate();
    } catch (error: any) {
      console.error(`Error ${action}ing application:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} application`,
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
      setViewerTitle(fileType === 'letter' ? 'Organization Letter' : 'Video Submission');
      const vt = ext === 'pdf' ? 'pdf' : (ext && ['mp4', 'mov', 'webm', 'avi'].includes(ext) ? 'video' : 'unknown');
      setViewerType(vt as 'pdf' | 'video' | 'unknown');
      setViewerOpen(true);
    } catch (error: any) {
      console.error('[ScoutApplicationCard] Error downloading file:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to open file. Please try again.',
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
        title: 'Error',
        description: 'Failed to load scout profile. Please try again.',
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
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {application.sport}
              </Badge>
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
              Applied: {format(new Date(application.created_at), "MMM d, yyyy")}
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
              View Organization Letter
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => openFile(application.video_submission_url, 'video')}
              disabled={!application.video_submission_url || loading}
            >
              <Video className="mr-2 h-4 w-4" />
              View Video Submission
            </Button>

            {application.status === "approved" && (
              <Button
                variant="default"
                className="w-full justify-start"
                onClick={handleViewProfile}
                disabled={loading}
              >
                <User className="mr-2 h-4 w-4" />
                View Profile
              </Button>
            )}

            {application.status === "pending" && (
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => handleAction("approve")}
                  disabled={loading}
                  className="flex-1"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleAction("deny")}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1"
                >
                  <X className="mr-2 h-4 w-4" />
                  Deny
                </Button>
              </div>
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
              <p className="text-sm text-muted-foreground">Preview not available. Use download instead.</p>
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
              Open in new tab
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
              Download
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
