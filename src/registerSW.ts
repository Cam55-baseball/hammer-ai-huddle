import { Workbox } from 'workbox-window';

/**
 * Service Worker registration with auto-update + safe silent reload.
 *
 * Behavior:
 * - In Lovable editor preview / iframes: never register; unregister any leftovers.
 * - In published builds: register, auto-skip-waiting, and silently reload the page
 *   exactly once when the new SW takes control — but only when the user is idle
 *   (no focused input, no open dialog) to avoid losing in-flight work.
 * - Polls registration.update() every 60s and on visibility/online events so
 *   long-open tabs pick up new deploys quickly.
 */

let waitingSW: ServiceWorker | null = null;

export function getWaitingSW() {
  return waitingSW;
}

const RELOAD_FLAG = '__sw_reloaded_once';

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

function isUserBusy(): boolean {
  // Don't reload while typing
  const active = document.activeElement as HTMLElement | null;
  if (active) {
    const tag = active.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.isContentEditable) {
      return true;
    }
  }
  // Don't reload while a modal/dialog/sheet is open
  if (document.querySelector('[role="dialog"]:not([aria-hidden="true"])')) return true;
  if (document.querySelector('[data-state="open"][role="alertdialog"]')) return true;
  return false;
}

function safeReload() {
  try {
    sessionStorage.setItem(RELOAD_FLAG, '1');
  } catch {
    /* ignore */
  }
  window.location.reload();
}

function scheduleSafeReload() {
  if (sessionStorage.getItem(RELOAD_FLAG) === '1') return; // already reloaded once

  if (!isUserBusy()) {
    safeReload();
    return;
  }

  // Retry every 5s; also retry on visibility change
  const interval = window.setInterval(() => {
    if (sessionStorage.getItem(RELOAD_FLAG) === '1') {
      window.clearInterval(interval);
      return;
    }
    if (!isUserBusy()) {
      window.clearInterval(interval);
      safeReload();
    }
  }, 5000);

  const onVis = () => {
    if (document.visibilityState === 'visible' && !isUserBusy()) {
      document.removeEventListener('visibilitychange', onVis);
      window.clearInterval(interval);
      safeReload();
    }
  };
  document.addEventListener('visibilitychange', onVis);
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

  // Clear the once-per-session reload flag at the start of a fresh page load that
  // wasn't itself the auto-reload (sessionStorage already persists across reloads
  // within the same tab session, so we leave it set to keep the loop guard).
  // Nothing to clear here — the flag intentionally persists for the tab session.

  const wb = new Workbox('/sw.js');

  wb.addEventListener('waiting', () => {
    // Capture for legacy PWAUpdatePrompt consumers
    wb.getSW().then((sw) => {
      waitingSW = sw;
    });
    // Tell the waiting SW to activate immediately — no user tap required.
    wb.messageSkipWaiting();
  });

  wb.addEventListener('controlling', () => {
    // New SW has taken control. Reload once (gated by user-busy check).
    scheduleSafeReload();
  });

  wb.register().then((registration) => {
    if (!registration) return;

    // Poll for new SW versions periodically
    const poll = () => registration.update().catch(() => undefined);
    window.setInterval(poll, 60_000);

    // Also check when the tab becomes visible or comes back online
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') poll();
    });
    window.addEventListener('online', poll);
  }).catch((err) => {
    console.warn('Service worker registration failed:', err);
  });
}
