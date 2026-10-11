import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Plays an exercise's owner-uploaded video inside its "How to do it" drop-down.
 * Accepts an explicit ref (https link or `exercise-videos/<path>`), or looks up
 * the live Vault version's video for the slug. Storage refs are resolved to a
 * short-lived signed URL; nothing renders when there is no video.
 */
export function ExerciseVideo({ slug, url }: { slug?: string | null; url?: string | null }) {
  const [ref, setRef] = useState<string | null>(url ?? null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (url) { setRef(url); return; }
    if (!slug) { setRef(null); return; }
    supabase.rpc("get_exercise_video", { _slug: slug }).then(({ data, error }) => {
      if (!cancelled) setRef(error ? null : ((data as string | null) ?? null));
    });
    return () => { cancelled = true; };
  }, [slug, url]);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    if (!ref) return;
    if (/^https:\/\//i.test(ref)) { setSrc(ref); return; }
    const path = ref.replace(/^exercise-videos\//, "");
    supabase.storage.from("exercise-videos").createSignedUrl(path, 3600).then(({ data, error }) => {
      if (!cancelled && !error && data?.signedUrl) setSrc(data.signedUrl);
    });
    return () => { cancelled = true; };
  }, [ref]);

  if (!src) return null;
  return (
    <video
      data-exercise-video
      controls
      playsInline
      preload="metadata"
      className="w-full rounded-lg border border-border"
      src={src}
    />
  );
}
