import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { detectPlatform } from "@/lib/videoEmbed";

export interface LandingDemoVideo {
  id: string;
  video_url: string;
  /** Raw storage path of the video, needed so we can delete the object. */
  video_path: string | null;
  video_type: string;
  title: string | null;
  is_visible: boolean;
  /** Signed URL of the cover image, or null when no cover has been set. */
  poster_url: string | null;
  /** Raw storage path of the cover, needed so we can replace/delete the object. */
  poster_path: string | null;
  updated_at: string;
}

export interface SaveVideoInput {
  video_url: string;
  video_type?: string;
  title?: string | null;
  is_visible?: boolean;
  poster_url?: string | null;
}

const BUCKET = "landing-demo";
const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

/** Sign a storage path in the private bucket; pass full URLs through untouched. */
async function sign(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Convert storage paths in the private landing-demo bucket into signed URLs
 * that load for anyone with the link (7 day expiry, refreshed on each page load).
 * External video URLs (YouTube etc.) are passed through untouched.
 */
async function resolvePlayableUrl(row: LandingDemoVideo): Promise<LandingDemoVideo> {
  // The DB columns hold storage paths; keep them so deletes can target the object.
  const poster_path = row.poster_url;
  const video_path = row.video_type === "upload" ? row.video_url : null;
  const poster_url = await sign(poster_path);
  // Only uploads live in our bucket; external links play as-is.
  const video_url =
    row.video_type === "upload" ? ((await sign(row.video_url)) ?? row.video_url) : row.video_url;
  return { ...row, video_url, video_path, poster_url, poster_path };
}

export function useLandingDemoVideo(includeHidden = false) {
  const [video, setVideo] = useState<LandingDemoVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  /** True when the lookup itself failed (backend down), not merely "no row". */
  const [errored, setErrored] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("landing_demo_video")
      .select("id, video_url, video_type, title, is_visible, poster_url, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (!includeHidden) query = query.eq("is_visible", true);
    const { data, error } = await query.maybeSingle();
    setErrored(!!error);
    if (error || !data) {
      setVideo(null);
    } else {
      setVideo(await resolvePlayableUrl(data as LandingDemoVideo));
    }
    setLoading(false);
  }, [includeHidden]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (input: SaveVideoInput) => {
      setSaving(true);
      try {
        const detected = detectPlatform(input.video_url);
        const video_type =
          input.video_type ??
          (detected === "unknown" ? "external" : detected);

        // Replace existing row so we keep exactly one demo video
        const { data: existing } = await supabase
          .from("landing_demo_video")
          .select("id")
          .limit(1)
          .maybeSingle();

        const payload = {
          video_url: input.video_url,
          video_type,
          title: input.title ?? null,
          is_visible: input.is_visible ?? true,
          // Only touch the cover when the caller says so; `undefined` leaves it alone.
          ...(input.poster_url !== undefined ? { poster_url: input.poster_url } : {}),
          updated_by: (await supabase.auth.getUser()).data.user?.id ?? null,
        };

        if (existing?.id) {
          const { error } = await supabase
            .from("landing_demo_video")
            .update(payload)
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("landing_demo_video")
            .insert(payload);
          if (error) throw error;
        }
        await load();
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  const setVisibility = useCallback(
    async (visible: boolean) => {
      if (!video) return;
      setSaving(true);
      try {
        const { error } = await supabase
          .from("landing_demo_video")
          .update({ is_visible: visible })
          .eq("id", video.id);
        if (error) throw error;
        await load();
      } finally {
        setSaving(false);
      }
    },
    [video, load],
  );

  const remove = useCallback(async () => {
    if (!video) return;
    setSaving(true);
    try {
      // Best-effort: delete storage objects (video + cover) if they live in our bucket.
      const orphans = [video.video_path, video.poster_path].filter(
        (p): p is string => !!p && !/^https?:\/\//i.test(p),
      );
      if (orphans.length) await supabase.storage.from(BUCKET).remove(orphans);
      const { error } = await supabase
        .from("landing_demo_video")
        .delete()
        .eq("id", video.id);
      if (error) throw error;
      await load();
    } finally {
      setSaving(false);
    }
  }, [video, load]);

  const uploadFile = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `demo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      // Store the storage path (not a URL) so we can re-sign on each read.
      // A new video invalidates any cover grabbed from the old one.
      await save({
        video_url: path,
        video_type: "upload",
        title: file.name,
        poster_url: null,
      });
    },
    [save],
  );

  /** Save a cover image (frame grab or gallery photo) for the current video. */
  const uploadPoster = useCallback(
    async (blob: Blob, ext = "jpg") => {
      if (!video) return;
      setSaving(true);
      try {
        const path = `poster-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { upsert: true, contentType: blob.type || "image/jpeg" });
        if (upErr) throw upErr;

        const { error } = await supabase
          .from("landing_demo_video")
          .update({ poster_url: path })
          .eq("id", video.id);
        if (error) throw error;

        // Best-effort cleanup of the cover we just replaced.
        const previous = video.poster_path;
        if (previous && !/^https?:\/\//i.test(previous)) {
          await supabase.storage.from(BUCKET).remove([previous]);
        }
        await load();
      } finally {
        setSaving(false);
      }
    },
    [video, load],
  );

  const clearPoster = useCallback(async () => {
    if (!video) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("landing_demo_video")
        .update({ poster_url: null })
        .eq("id", video.id);
      if (error) throw error;
      const previous = video.poster_path;
      if (previous && !/^https?:\/\//i.test(previous)) {
        await supabase.storage.from(BUCKET).remove([previous]);
      }
      await load();
    } finally {
      setSaving(false);
    }
  }, [video, load]);

  return {
    video,
    errored,
    loading,
    saving,
    save,
    setVisibility,
    remove,
    uploadFile,
    uploadPoster,
    clearPoster,
    reload: load,
  };
}
