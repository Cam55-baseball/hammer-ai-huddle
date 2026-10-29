/** Keep legal reading in the current screen; only our own entry may be dismissed. */
export const LEGAL_OVERLAY_KEY = "hammersLegalOverlay";
export function openLegalOverlay(id: string) {
  window.history.pushState({ ...window.history.state, [LEGAL_OVERLAY_KEY]: id }, "", window.location.href);
}
export function closeLegalOverlay(id: string) {
  if (window.history.state?.[LEGAL_OVERLAY_KEY] === id) window.history.back();
}
export function legalLinkSlug(href: string): string | null {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    const match = /^\/legal\/([a-z0-9-]+)\/?$/.exec(url.pathname);
    return match?.[1] ?? (/^\/(terms|privacy)\/?$/.exec(url.pathname)?.[1] ?? null);
  } catch { return null; }
}