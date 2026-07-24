import { useRef, useState } from "react";
import { useLandingDemoVideo } from "@/hooks/useLandingDemoVideo";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { validateVideoFile } from "@/data/videoLimits";
import { Loader2, Upload, Trash2, Link as LinkIcon, Eye, EyeOff } from "lucide-react";

/**
 * Owner-only panel for uploading/replacing/hiding/removing the landing demo video.
 * Renders nothing for non-owners.
 */
export function LandingDemoVideoManager() {
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { video, loading, saving, save, setVisibility, remove, uploadFile } =
    useLandingDemoVideo(true);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  if (ownerLoading || !isOwner) return null;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const check = validateVideoFile(file);
    if (!check.valid) {
      toast({ title: "Can't use this file", description: check.error, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      await uploadFile(file);
      toast({ title: "Demo video uploaded", description: "It's live on the landing page." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message ?? "Try again", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleUrl = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    try {
      await save({ video_url: trimmed, is_visible: true });
      toast({ title: "Demo video saved", description: "Playing on the landing page." });
      setUrl("");
    } catch (err: any) {
      toast({ title: "Couldn't save", description: err?.message ?? "Try again", variant: "destructive" });
    }
  };

  const handleRemove = async () => {
    try {
      await remove();
      toast({ title: "Removed", description: "The landing page slot is now empty." });
    } catch (err: any) {
      toast({ title: "Couldn't remove", description: err?.message ?? "Try again", variant: "destructive" });
    }
  };

  const busy = loading || saving || uploading;

  return (
    <Card className="max-w-2xl mx-auto mt-4 p-4 text-left border-dashed">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold">Manage landing demo video</p>
          <p className="text-xs text-muted-foreground">
            Owner-only. Changes go live immediately — no Lovable credits used.
          </p>
        </div>
        {video && (
          <div className="flex items-center gap-2">
            {video.is_visible ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
            <Label htmlFor="demo-visible" className="text-xs">Visible</Label>
            <Switch
              id="demo-visible"
              checked={video.is_visible}
              disabled={busy}
              onCheckedChange={setVisibility}
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Upload from your device</Label>
          <div className="flex gap-2 mt-1">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? "Uploading…" : "Choose video file"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="demo-url" className="text-xs">Or paste a link (YouTube, Vimeo, X, TikTok, MP4)</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="demo-url"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
            />
            <Button type="button" onClick={handleUrl} disabled={busy || !url.trim()}>
              <LinkIcon className="h-4 w-4 mr-2" />
              Save link
            </Button>
          </div>
        </div>

        {video && (
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-xs text-muted-foreground truncate max-w-[70%]">
              Current: {video.title ?? video.video_type}
            </p>
            <Button variant="ghost" size="sm" onClick={handleRemove} disabled={busy}>
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
