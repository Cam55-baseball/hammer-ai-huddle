/**
 * Centralized URL parsing for video embeds. Used by both the public player
 * and the library card thumbnails so they can never drift apart.
 *
 * Supports: YouTube (watch / youtu.be / embed / shorts / live, any subdomain),
 * Vimeo, X/Twitter status URLs, and TikTok video URLs.
 */

export type VideoPlatform = 'youtube' | 'vimeo' | 'twitter' | 'tiktok' | 'unknown';

export function parseYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  // Try several patterns, ordered most-specific first.
  const patterns: RegExp[] = [
    /youtu\.be\/([A-Za-z0-9_-]{6,})/i,
    /youtube\.com\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{6,})/i,
    /[?&]v=([A-Za-z0-9_-]{6,})/i,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}

export function parseYouTubeStartSeconds(url: string | null | undefined): number | null {
  if (!url) return null;
  const m = url.match(/[?&](?:t|start)=(\d+)(?:s)?/i);
  if (m) return parseInt(m[1], 10) || null;
  // YouTube also accepts "1m30s" style — convert to seconds
  const hms = url.match(/[?&]t=(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
  if (hms && (hms[1] || hms[2] || hms[3])) {
    const h = parseInt(hms[1] || '0', 10);
    const m2 = parseInt(hms[2] || '0', 10);
    const s = parseInt(hms[3] || '0', 10);
    const total = h * 3600 + m2 * 60 + s;
    return total || null;
  }
  return null;
}

export function parseVimeoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return m ? m[1] : null;
}

export function parseTweetId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status(?:es)?\/(\d+)/i);
  return m ? m[1] : null;
}

export function parseTikTokId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/tiktok\.com\/(?:@[^/]+\/video|v)\/(\d+)/i);
  return m ? m[1] : null;
}

export function detectPlatform(url: string | null | undefined): VideoPlatform {
  if (!url) return 'unknown';
  if (parseYouTubeId(url)) return 'youtube';
  if (parseVimeoId(url)) return 'vimeo';
  if (parseTweetId(url)) return 'twitter';
  if (parseTikTokId(url)) return 'tiktok';
  return 'unknown';
}

export interface EmbedInfo {
  platform: VideoPlatform;
  embedUrl: string | null;
  thumbnailUrl: string | null;
}

export function getEmbedInfo(url: string | null | undefined): EmbedInfo {
  if (!url) return { platform: 'unknown', embedUrl: null, thumbnailUrl: null };

  const ytId = parseYouTubeId(url);
  if (ytId) {
    const start = parseYouTubeStartSeconds(url);
    const embedUrl = `https://www.youtube.com/embed/${ytId}${start ? `?start=${start}` : ''}`;
    return {
      platform: 'youtube',
      embedUrl,
      thumbnailUrl: `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
    };
  }

  const vimeoId = parseVimeoId(url);
  if (vimeoId) {
    return {
      platform: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      thumbnailUrl: null,
    };
  }

  const tweetId = parseTweetId(url);
  if (tweetId) {
    return {
      platform: 'twitter',
      // Twitter's embed widget accepts a Tweet ID and renders the full card,
      // including any attached video/photo.
      embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}&theme=dark&dnt=true`,
      thumbnailUrl: null,
    };
  }

  const tiktokId = parseTikTokId(url);
  if (tiktokId) {
    return {
      platform: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${tiktokId}`,
      thumbnailUrl: null,
    };
  }

  return { platform: 'unknown', embedUrl: null, thumbnailUrl: null };
}
