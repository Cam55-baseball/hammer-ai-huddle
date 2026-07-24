import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { detectPlatform } from "@/lib/videoEmbed";

export interface LandingDemoVideo {
  id: string;
  video_url: string;
  video_type: string;
  title: string | null;
  is_visible: boolean;
  updated_at: string;
}

export interface SaveVideoInput {
  video_url: string;
  video_type?: string;
  title?: string | null;
  is_visible?: boolean;
}

const BUCKET = "landing-demo";

/**
 * Convert a storage path in the private landing-demo bucket into a signed URL
 * that plays for anyone with the link (7 day expiry, refreshed on each page load).
 * External URLs (YouTube etc.) are passed through untouched.
 */
async function resolvePlayableUrl(row: LandingDemoVideo): Promise<LandingDemoVideo> {
  if (row.video_type !== "upload") return row;
  // If we stored a storage path (no scheme), sign it. Legacy full URLs pass through.
  if (/^https?:\/\//i.test(row.video_url)) return row;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.video_url, 60 * 60 * 24 * 7);
  if (error || !data?.signedUrl) return row;
  return { ...row, video_url: data.signedUrl };
}

export function useLandingDemoVideo(includeHidden = false) {
  const [video, setVideo] = useState<LandingDemoVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("landing_demo_video")
      .select("id, video_url, video_type, title, is_visible, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (!includeHidden) query = query.eq("is_visible", true);
    const { data, error } = await query.maybeSingle();
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
      // Best-effort: delete storage object if it was an upload with a bucket path
      if (video.video_type === "upload" && !/^https?:\/\//i.test(video.video_url)) {
        await supabase.storage.from(BUCKET).remove([video.video_url]);
      }
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
      // Store the storage path (not a URL) so we can re-sign on each read
      await save({ video_url: path, video_type: "upload", title: file.name });
    },
    [save],
  );

  return { video, loading, saving, save, setVisibility, remove, uploadFile, reload: load };
}
