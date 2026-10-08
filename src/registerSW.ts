import { Workbox } from 'workbox-window';

/**
 * Service Worker registration with quiet update discovery.
 *
 * Why the version probe exists:
 * - On iOS/Android, a standalone PWA cold-launches with the SW already in
 *   control, so `controllerchange` never fires → our reload-on-new-SW path
 *   is skipped → users stay on the old build forever.
 * An active visit is never reloaded by update code. A newly installed worker
 * is used on the next real navigation so an open card and unsaved work survive
 * background/foreground transitions.
 */

let waitingSW: ServiceWorker | null = null;

export function getWaitingSW() {
  return waitingSW;
}

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost(): boolean {
  const h = window.location.hostname;
  return h.includes('id-preview--') || h.includes('lovableproject.com');
}

export function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  // Editor preview / iframe: hard-disable any SW so the live preview is never stale.
  if (isInIframe() || isPreviewHost()) {
    navigator.serviceWorker.getRegistrations().then((rs) => {
      rs.forEach((r) => r.unregister().catch(() => undefined));
    });
    return;
  }

  const wb = new Workbox('/sw.js');

  wb.addEventListener('waiting', () => {
    wb.getSW().then((sw) => {
      waitingSW = sw;
    });
    // Activate immediately — no user tap required.
    wb.messageSkipWaiting();
  });

  wb.addEventListener('activated', () => {
    // New SW is in charge. Drop the cached HTML shell so the next
    // navigation forces a fresh index.html from the network.
    if ('caches' in window) {
      caches.delete('html-shell').catch(() => undefined);
    }
  });

  wb.register().then((registration) => {
    if (!registration) return;

    const poll = () => registration.update().catch(() => undefined);
    window.setInterval(poll, 30_000);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') poll();
    });
    window.addEventListener('online', poll);
  }).catch((err) => {
    console.warn('Service worker registration failed:', err);
  });
}
