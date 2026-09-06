/**
 * One place that answers "what image represents this video?".
 *
 * Order of truth:
 *   1. A stored thumbnail_url (poster we generated, or a backfilled platform image).
 *   2. A platform-derivable image (YouTube / Vimeo carry one per video id).
 *   3. Nothing — the caller paints a first frame (self-hosted files) or a
 *      clean labelled placeholder. Never a broken <img>.
 */
import { supabase } from "@/integrations/supabase/client";
import { getEmbedInfo, detectPlatform, isDirectVideoFile } from "@/lib/videoEmbed";

export interface ThumbSource {
  thumbnail_url?: string | null;
  video_url?: string | null;
}

/** Stored poster, else a platform-derived one, else null. */
export function resolveThumbnailUrl(v: ThumbSource | null | undefined): string | null {
  if (!v) return null;
  if (v.thumbnail_url) return v.thumbnail_url;
  return getEmbedInfo(v.video_url).thumbnailUrl;
}

/** Human label for the placeholder so an empty box still says something true. */
export function platformLabel(url: string | null | undefined): string | null {
  const p = detectPlatform(url);
  return p === "youtube" ? "YouTube"
    : p === "vimeo" ? "Vimeo"
    : p === "twitter" ? "X / Twitter"
    : p === "tiktok" ? "TikTok"
    : isDirectVideoFile(url) ? "Video"
    : null;
}

/**
 * Draw a poster frame from a video URL (self-hosted clips only — cross-origin
 * platform players cannot be read into a canvas).
 */
export function generateThumbnailFromUrl(url: string, timeInSeconds = 0.2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas 2D context not supported"));

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Poster generation timed out"));
    }, 15000);

    const cleanup = () => {
      clearTimeout(timeout);
      video.removeAttribute("src");
      video.load();
    };

    video.addEventListener("loadedmetadata", () => {
      if (!video.videoWidth || !video.videoHeight) {
        cleanup();
        reject(new Error("This browser could not decode the video"));
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.currentTime = Math.min(timeInSeconds, Math.max(0.05, (video.duration || 1) * 0.1));
    });

    video.addEventListener("seeked", () => {
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            blob ? resolve(blob) : reject(new Error("Could not encode the poster frame"));
          },
          "image/jpeg",
          0.82,
        );
      } catch (err) {
        cleanup();
        reject(err as Error);
      }
    });

    video.addEventListener("error", () => {
      cleanup();
      reject(new Error("This browser could not load the video"));
    });

    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = url;
  });
}

export interface ThumbnailBackfillReport {
  updated: number;
  derived: number;
  generated: number;
  failed: { id: string; title: string; reason: string }[];
}

/**
 * Backfill every library video that has no poster.
 * Platform videos get their derivable image; self-hosted clips get a real
 * frame rendered in the browser and uploaded to storage. Failures are reported,
 * never swallowed.
 */
export async function backfillLibraryThumbnails(userId: string): Promise<ThumbnailBackfillReport> {
  const report: ThumbnailBackfillReport = { updated: 0, derived: 0, generated: 0, failed: [] };

  const { data, error } = await supabase
    .from("library_videos")
    .select("id, title, video_url, thumbnail_url")
    .is("thumbnail_url", null);
  if (error) throw error;

  for (const row of data ?? []) {
    const title = row.title ?? "Untitled";
    try {
      const derived = getEmbedInfo(row.video_url).thumbnailUrl;
      let url = derived;

      if (!url) {
        if (!isDirectVideoFile(row.video_url)) {
          report.failed.push({ id: row.id, title, reason: "no poster can be derived for this host" });
          continue;
        }
        const blob = await generateThumbnailFromUrl(row.video_url!);
        const path = `${userId}/thumbnails/library_${row.id}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("videos")
          .upload(path, blob, { contentType: "image/jpeg", cacheControl: "3600", upsert: true });
        if (upErr) throw upErr;
        url = supabase.storage.from("videos").getPublicUrl(path).data.publicUrl;
        report.generated += 1;
      } else {
        report.derived += 1;
      }

      const { error: updErr } = await supabase
        .from("library_videos")
        .update({ thumbnail_url: url })
        .eq("id", row.id);
      if (updErr) throw updErr;
      report.updated += 1;
    } catch (err) {
      report.failed.push({ id: row.id, title, reason: (err as Error).message });
    }
  }

  return report;
}
