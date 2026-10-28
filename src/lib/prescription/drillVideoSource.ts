// A drill video is EITHER an owner upload OR a YouTube/Vimeo link played through the
// official embed player. Never download or re-host third-party video. No video = none.

export type DrillVideoSource =
  | { kind: "upload"; storagePath: string }
  | { kind: "youtube"; id: string; embedUrl: string }
  | { kind: "vimeo"; id: string; embedUrl: string };

export function parseDrillVideoLink(raw: string): DrillVideoSource | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\.|^m\./, "");
  let yt: string | null = null;
  if (host === "youtu.be") yt = u.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") yt = u.searchParams.get("v");
    else { const m = u.pathname.match(/^\/(embed|shorts|live)\/([^/]+)/); if (m) yt = m[2]; }
  }
  if (yt && /^[A-Za-z0-9_-]{11}$/.test(yt)) {
    return { kind: "youtube", id: yt, embedUrl: `https://www.youtube-nocookie.com/embed/${yt}` };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/(?:^|\/)(?:video\/)?(\d{6,12})(?:\/|$)/);
    if (m) return { kind: "vimeo", id: m[1], embedUrl: `https://player.vimeo.com/video/${m[1]}` };
  }
  return null;
}

export function drillVideoSource(d: { video_storage_path?: string | null; video_link?: string | null }): DrillVideoSource | null {
  if (d.video_storage_path) return { kind: "upload", storagePath: d.video_storage_path };
  if (d.video_link) return parseDrillVideoLink(d.video_link);
  return null;
}

/** Owner uploads (our storage) or YouTube/Vimeo links only; empty means "no video yet". */
export function isAcceptedDrillVideoUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return true;
  if (parseDrillVideoLink(url)) return true;
  try { return /\/storage\/v1\/object\//.test(new URL(url).pathname); } catch { return false; }
}
