import { MOMENT_CONFIG } from './registry';
import type { VideoMomentKind } from './types';

const KEY = 'hammer:videoMoments:v1';
const DAILY_CAP = 6;

interface Store {
  day: string;
  shownToday: number;
  lastByKind: Record<string, number>;
  dismissedVideos: Record<string, number>;
}

const today = () => new Date().toISOString().slice(0, 10);

function read(userId?: string | null): Store {
  const empty: Store = { day: today(), shownToday: 0, lastByKind: {}, dismissedVideos: {} };
  try {
    const raw = localStorage.getItem(`${KEY}:${userId || 'anon'}`);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Store;
    if (parsed.day !== today()) return { ...empty, dismissedVideos: parsed.dismissedVideos || {} };
    return { ...empty, ...parsed };
  } catch {
    return empty;
  }
}

function write(userId: string | null | undefined, store: Store) {
  try {
    localStorage.setItem(`${KEY}:${userId || 'anon'}`, JSON.stringify(store));
  } catch {
    /* storage may be unavailable */
  }
}

/** True when this moment kind is allowed to pop up right now. */
export function canShowMoment(userId: string | null | undefined, kind: VideoMomentKind): boolean {
  const store = read(userId);
  if (store.shownToday >= DAILY_CAP) return false;
  const cooldownMs = MOMENT_CONFIG[kind].cooldownMinutes * 60_000;
  if (cooldownMs <= 0) return true;
  const last = store.lastByKind[kind] || 0;
  return Date.now() - last >= cooldownMs;
}

export function markMomentShown(userId: string | null | undefined, kind: VideoMomentKind) {
  const store = read(userId);
  store.lastByKind[kind] = Date.now();
  store.shownToday += 1;
  write(userId, store);
}

/** "Not now" on a specific video — suppressed for 7 days. */
export function dismissMomentVideo(userId: string | null | undefined, videoId: string) {
  const store = read(userId);
  store.dismissedVideos[videoId] = Date.now();
  write(userId, store);
}

export function isVideoDismissed(userId: string | null | undefined, videoId: string): boolean {
  const store = read(userId);
  const at = store.dismissedVideos[videoId];
  if (!at) return false;
  return Date.now() - at < 7 * 86_400_000;
}
