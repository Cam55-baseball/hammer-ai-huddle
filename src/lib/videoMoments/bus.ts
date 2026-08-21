import type { VideoMomentEvent } from './types';

const EVENT_NAME = 'hammer:video-moment';

/**
 * Fire a video moment from anywhere (analysis finish, session save, game log…).
 * The global <VideoMomentHost /> picks it up and pops the sheet when allowed.
 */
export function emitVideoMoment(event: VideoMomentEvent) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<VideoMomentEvent>(EVENT_NAME, { detail: event }));
}

export function onVideoMoment(handler: (event: VideoMomentEvent) => void) {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event) => handler((e as CustomEvent<VideoMomentEvent>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
