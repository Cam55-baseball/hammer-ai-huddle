import { Workbox } from 'workbox-window';

let waitingSW: ServiceWorker | null = null;

export function getWaitingSW() {
  return waitingSW;
}

export function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  const wb = new Workbox('/sw.js');

  wb.addEventListener('waiting', () => {
    waitingSW = wb.getSW() as unknown as ServiceWorker;
    // Let the waiting SW be accessible
    wb.getSW().then((sw) => {
      waitingSW = sw;
    });
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  });

  wb.register().catch((err) => {
    console.warn('Service worker registration failed:', err);
  });
}
