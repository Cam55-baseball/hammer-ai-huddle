import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Camera, Crosshair, ImageIcon, Loader2, Trash2 } from "lucide-react";
import {
  captureVideoFrame,
  FrameCaptureError,
  seekTo,
} from "@/lib/landing/captureVideoFrame";
import type { LandingDemoVideo } from "@/hooks/useLandingDemoVideo";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB is plenty for a cover image

interface DemoCoverPickerProps {
  video: LandingDemoVideo;
  busy: boolean;
  onUploadPoster: (blob: Blob, ext?: string) => Promise<void>;
  onClearPoster: () => Promise<void>;
}

/**
 * Owner control for the landing demo video's cover image.
 *
 * Two paths:
 *  1. Scrub the uploaded video and grab the displayed frame (uploads only —
 *     browsers can't read pixels out of a YouTube/Vimeo embed).
 *  2. Pick a photo from the camera roll / gallery / file picker.
 */
export function DemoCoverPicker({
  video,
  busy,
  onUploadPoster,
  onClearPoster,
}: DemoCoverPickerProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [working, setWorking] = useState(false);

  const canGrabFrame = video.video_type === "upload" && !!video.video_url;
  const disabled = busy || working;

  const handleScrub = async ([next]: number[]) => {
    setPosition(next);
    const el = videoRef.current;
    if (el) await seekTo(el, next);
  };

  const handleUseFrame = async () => {
    const el = videoRef.current;
    if (!el) return;
    setWorking(true);
    try {
      await seekTo(el, position);
      const blob = await captureVideoFrame(el);
      await onUploadPoster(blob, "jpg");
      toast({
        title: "Cover image set",
        description: "That frame now shows before anyone hits play.",
      });
    } catch (err: unknown) {
      const description =
        err instanceof FrameCaptureError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Try again.";
      toast({ title: "Couldn't use that frame", description, variant: "destructive" });
    } finally {
      setWorking(false);
    }
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Not an image",
        description: "Pick a photo (JPG, PNG, HEIC or WebP).",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({
        title: "Image too large",
        description: "Cover images need to be under 8 MB.",
        variant: "destructive",
      });
      return;
    }
    setWorking(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      await onUploadPoster(file, ext);
      toast({ title: "Cover image set", description: "It's live on the welcome page." });
    } catch (err: unknown) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setWorking(false);
    }
  };

  const handleClear = async () => {
    setWorking(true);
    try {
      await onClearPoster();
      toast({ title: "Cover removed" });
    } catch (err: unknown) {
      toast({
        title: "Couldn't remove cover",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="pt-3 border-t space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-semibold">Cover image</Label>
          <p className="text-[11px] text-muted-foreground">
            Shown before anyone presses play, so the video isn't a black box.
          </p>
        </div>
        {video.poster_url && (
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={disabled}>
            <Trash2 className="h-4 w-4 mr-1" />
            Remove
          </Button>
        )}
      </div>

      {video.poster_url ? (
        <div className="flex items-center gap-3">
          <img
            src={video.poster_url}
            alt="Current demo video cover"
            className="h-16 w-28 rounded-md object-cover border border-border"
          />
          <p className="text-xs text-muted-foreground">Current cover</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
          No cover set yet
        </div>
      )}

      {canGrabFrame && (
        <div className="space-y-2">
          <Label className="text-xs">Pick a frame from the video</Label>
          <div className="rounded-lg overflow-hidden bg-black aspect-video">
            <video
              ref={videoRef}
              src={video.video_url}
              // Needed so the canvas isn't tainted when we read the frame back.
              crossOrigin="anonymous"
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-contain"
              onLoadedMetadata={(e) => {
                const el = e.currentTarget;
                setDuration(Number.isFinite(el.duration) ? el.duration : 0);
                // Nudge off frame 0 — the very first frame is often black.
                void seekTo(el, Math.min(0.1, el.duration || 0));
              }}
            />
          </div>
          <Slider
            value={[position]}
            min={0}
            max={Math.max(duration, 0.1)}
            step={0.05}
            disabled={disabled || duration === 0}
            onValueChange={handleScrub}
            aria-label="Scrub to the frame you want as the cover"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {position.toFixed(1)}s / {duration.toFixed(1)}s
            </span>
            <Button type="button" size="sm" onClick={handleUseFrame} disabled={disabled}>
              {working ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Crosshair className="h-4 w-4 mr-2" />
              )}
              Use this frame
            </Button>
          </div>
        </div>
      )}

      <div>
        <Label className="text-xs">Or upload a cover photo</Label>
        <Button
          type="button"
          variant="secondary"
          className="w-full mt-1"
          disabled={disabled}
          onClick={() => photoInputRef.current?.click()}
        >
          {working ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Camera className="h-4 w-4 mr-2" />
          )}
          Choose photo
        </Button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhoto}
        />
      </div>
    </div>
  );
}
