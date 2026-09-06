import { useCallback, useState } from "react";
import { VideoLightbox, type LightboxVideo } from "./VideoLightbox";

/**
 * One line to give any surface in-app video playback.
 * Nothing navigates the browser away, so the athlete never loses their place
 * or their session by watching a clip.
 */
export function useVideoLightbox() {
  const [video, setVideo] = useState<LightboxVideo | null>(null);

  const open = useCallback((v: LightboxVideo) => setVideo(v), []);

  const element = (
    <VideoLightbox video={video} onOpenChange={(isOpen) => !isOpen && setVideo(null)} />
  );

  return { open, element };
}
