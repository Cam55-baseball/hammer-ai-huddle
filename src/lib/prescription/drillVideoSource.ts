// A drill video is an owner upload, an official-embed link (YouTube, Vimeo, TikTok,
// Instagram, X, Facebook), or any other https link shown ONLY as a "Watch on [site]"
// button that opens externally. Never download, re-host or embed an unknown site.

export type EmbedPlatform = "youtube" | "vimeo" | "tiktok" | "instagram" | "x" | "facebook";

export type DrillVideoSource =
  | { kind: "upload"; storagePath: string }
  | { kind: EmbedPlatform; id: string; embedUrl: string; originalUrl: string }
  | { kind: "external"; url: string; siteName: string };

export const PLATFORM_NAME: Record<EmbedPlatform, string> = {
  youtube: "YouTube", vimeo: "Vimeo", tiktok: "TikTok", instagram: "Instagram", x: "X", facebook: "Facebook",
};

function hostOf(u: URL): string { return u.hostname.toLowerCase().replace(/^(www\.|m\.|mobile\.|web\.)/, ""); }

/** Official embed only; null when the link is not a recognized post on a supported platform. */
export function parseEmbedLink(raw: string): Extract<DrillVideoSource, { embedUrl: string }> | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = hostOf(u);
  const originalUrl = u.toString();
  let yt: string | null = null;
  if (host === "youtu.be") yt = u.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") yt = u.searchParams.get("v");
    else { const m = u.pathname.match(/^\/(embed|shorts|live)\/([^/]+)/); if (m) yt = m[2]; }
  }
  if (yt && /^[A-Za-z0-9_-]{11}$/.test(yt)) {
    return { kind: "youtube", id: yt, embedUrl: `https://www.youtube-nocookie.com/embed/${yt}`, originalUrl };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/(?:^|\/)(?:video\/)?(\d{6,12})(?:\/|$)/);
    if (m) return { kind: "vimeo", id: m[1], embedUrl: `https://player.vimeo.com/video/${m[1]}`, originalUrl };
  }
  if (host === "tiktok.com") {
    const m = u.pathname.match(/^\/(?:@[^/]+\/video|embed\/v2|embed)\/(\d{8,25})(?:\/|$)/);
    if (m) return { kind: "tiktok", id: m[1], embedUrl: `https://www.tiktok.com/embed/v2/${m[1]}`, originalUrl };
  }
  if (host === "instagram.com") {
    const m = u.pathname.match(/^\/(?:[^/]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,40})(?:\/|$)/);
    if (m) {
      const type = m[1] === "reels" ? "reel" : m[1];
      return { kind: "instagram", id: m[2], embedUrl: `https://www.instagram.com/${type}/${m[2]}/embed`, originalUrl };
    }
  }
  if (host === "x.com" || host === "twitter.com") {
    const m = u.pathname.match(/^\/[A-Za-z0-9_]{1,15}\/status\/(\d{5,25})(?:\/|$)/);
    if (m) return { kind: "x", id: m[1], embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${m[1]}&dnt=true`, originalUrl };
  }
  if (host === "facebook.com" || host === "fb.watch") {
    const isVideo = host === "fb.watch"
      || /^\/[^/]+\/videos\/(?:[^/]+\/)?\d+/.test(u.pathname)
      || (u.pathname === "/watch" && /^\d+$/.test(u.searchParams.get("v") ?? ""))
      || /^\/(?:reel|watch)\/\d+/.test(u.pathname)
      || /^\/share\/(?:v|r)\/[A-Za-z0-9]+/.test(u.pathname);
    if (isVideo) {
      return { kind: "facebook", id: originalUrl,
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(originalUrl)}&show_text=false`, originalUrl };
    }
  }
  return null;
}

/** Plain site name for a "Watch on [site]" button. */
export function siteNameFor(u: URL): string {
  const h = hostOf(u);
  const parts = h.split(".");
  const core = parts.length >= 2 ? parts[parts.length - 2] : h;
  return core.charAt(0).toUpperCase() + core.slice(1);
}

/** Embed when a supported platform post; otherwise a plain external link. Null = not a usable https link. */
export function parseDrillVideoLink(raw: string): DrillVideoSource | null {
  const embed = parseEmbedLink(raw);
  if (embed) return embed;
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:" || !u.hostname.includes(".")) return null;
  const host = hostOf(u);
  // A supported platform's non-post page (profile, home) is not a video: refuse instead of linking out.
  if (["youtube.com", "youtu.be", "vimeo.com", "tiktok.com", "instagram.com", "x.com", "twitter.com", "facebook.com", "fb.watch"].includes(host)) return null;
  return { kind: "external", url: u.toString(), siteName: siteNameFor(u) };
}

export function isOwnStorageUrl(url: string): boolean {
  try { return /\/storage\/v1\/object\//.test(new URL(url).pathname); } catch { return false; }
}

export function drillVideoSource(d: { video_storage_path?: string | null; video_link?: string | null }): DrillVideoSource | null {
  if (d.video_storage_path) return { kind: "upload", storagePath: d.video_storage_path };
  if (d.video_link) return parseDrillVideoLink(d.video_link);
  return null;
}

/** Source for a stored drill video_url (upload in our storage, or a link). */
export function drillVideoFromUrl(url: string | null | undefined): DrillVideoSource | null {
  if (!url || !url.trim()) return null;
  if (isOwnStorageUrl(url)) {
    return { kind: "upload", storagePath: url };
  }
  return parseDrillVideoLink(url);
}

/** Platform label shown next to the link field and on the drill. */
export function drillVideoLabel(src: DrillVideoSource | null): string | null {
  if (!src) return null;
  if (src.kind === "upload") return "Your upload";
  if (src.kind === "external") return `Link to ${src.siteName} (opens outside the app)`;
  return `${PLATFORM_NAME[src.kind]} (official player)`;
}

/** Empty = no video yet. Otherwise an owner upload, an official embed, or a valid https link. */
export function isAcceptedDrillVideoUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return true;
  return isOwnStorageUrl(url) || !!parseDrillVideoLink(url);
}
