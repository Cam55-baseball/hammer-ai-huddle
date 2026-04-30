import { Workbox } from 'workbox-window';

/**
 * Service Worker registration with auto-update + safe silent reload,
 * plus a build-version probe that rescues installed Home Screen PWAs
 * from stale precached shells.
 *
 * Why the version probe exists:
 * - On iOS/Android, a standalone PWA cold-launches with the SW already in
 *   control, so `controllerchange` never fires → our reload-on-new-SW path
 *   is skipped → users stay on the old build forever.
 * - The probe fetches /version.json on every launch + visibility/pageshow,
 *   compares to the bundled __BUILD_ID__, and if mismatched: nukes caches,
 *   unregisters the SW, and reloads. This works even when the SW thread
 *   has been suspended by the OS.
 */

let waitingSW: ServiceWorker | null = null;

export function getWaitingSW() {
  return waitingSW;
}

const RELOAD_FLAG = '__sw_reloaded_once';
const VERSION_URL = '/version.json';

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
  const active = document.activeElement as HTMLElement | null;
  if (active) {
    const tag = active.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.isContentEditable) {
      return true;
    }
  }
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
  if (sessionStorage.getItem(RELOAD_FLAG) === '1') return;

  if (!isUserBusy()) {
    safeReload();
    return;
  }

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

async function nukeCachesAndSW() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => undefined)));
    }
  } catch {
    /* ignore */
  }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => undefined)));
    }
  } catch {
    /* ignore */
  }
}

let probeInFlight = false;

async function checkVersion() {
  if (probeInFlight) return;
  if (sessionStorage.getItem(RELOAD_FLAG) === '1') return;
  probeInFlight = true;
  try {
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      credentials: 'omit',
    });
    if (!res.ok) return;
    const data = (await res.json()) as { build?: string };
    const remote = data?.build;
    const local = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : '';
    if (!remote || !local || remote === local) return;

    // Build mismatch — wipe everything and reload (gated by isUserBusy via scheduleSafeReload).
    await nukeCachesAndSW();
    scheduleSafeReload();
  } catch {
    /* network error — try again next tick */
  } finally {
    probeInFlight = false;
  }
}

function wireVersionProbe() {
  // Initial check immediately on load
  void checkVersion();

  // Re-check whenever the tab becomes visible (covers Home Screen app foreground)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkVersion();
  });

  // pageshow fires on iOS standalone restore from bfcache
  window.addEventListener('pageshow', () => void checkVersion());

  // Also re-check on network restore
  window.addEventListener('online', () => void checkVersion());

  // Periodic safety net for long-open tabs
  window.setInterval(() => void checkVersion(), 30_000);
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

  // Stand up the version probe regardless of SW lifecycle — it's the most
  // reliable signal for installed Home Screen PWAs.
  wireVersionProbe();

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

  wb.addEventListener('controlling', () => {
    // New SW has taken control of this tab. Reload once (gated).
    scheduleSafeReload();
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
