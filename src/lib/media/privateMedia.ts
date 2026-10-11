/**
 * Private media (security fix A1, 2026-10-11). Athlete/applicant media buckets
 * are private. Stored rows still hold the old public-form link as a stable
 * reference; at display time it is swapped for a short-lived signed URL. The
 * backend decides who may sign (storage read rules + can_view_athlete_media),
 * so a raw or guessed link never plays on its own.
 */
import { supabase } from "@/integrations/supabase/client";

export const PRIVATE_MEDIA_BUCKETS = ["videos", "scout-letters", "scout-videos", "avatars"] as const;
export const SIGNED_URL_TTL_SECONDS = 3600;

const RE = new RegExp(
  `/storage/v1/object/(?:public|sign|authenticated)/(${PRIVATE_MEDIA_BUCKETS.join("|")})/([^?#]+)`,
);

export function parsePrivateMediaRef(url: string | null | undefined): { bucket: string; path: string } | null {
  if (!url || typeof url !== "string") return null;
  const m = url.match(RE);
  if (!m) return null;
  try { return { bucket: m[1], path: decodeURIComponent(m[2]) }; } catch { return { bucket: m[1], path: m[2] }; }
}

const cache = new Map<string, { url: string | null; exp: number }>();
const pending = new Map<string, Promise<string | null>>();
const queues = new Map<string, Map<string, Array<(u: string | null) => void>>>();

function flush(bucket: string) {
  const q = queues.get(bucket); queues.delete(bucket);
  if (!q || q.size === 0) return;
  const paths = [...q.keys()];
  supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS).then(({ data }) => {
    const byPath = new Map((data ?? []).map((d) => [d.path, d.error ? null : d.signedUrl] as const));
    for (const p of paths) {
      const u = byPath.get(p) ?? null;
      cache.set(`${bucket}/${p}`, { url: u, exp: Date.now() + (u ? (SIGNED_URL_TTL_SECONDS - 300) * 1000 : 30_000) });
      for (const cb of q.get(p) ?? []) cb(u);
    }
  }, () => { for (const p of paths) for (const cb of q.get(p) ?? []) cb(null); });
}

/** Returns a signed URL for private-bucket links, the input unchanged otherwise, or null if access is denied. */
export function resolveMediaUrl(url: string | null | undefined): Promise<string | null> {
  const ref = parsePrivateMediaRef(url);
  if (!ref) return Promise.resolve(url ?? null);
  const key = `${ref.bucket}/${ref.path}`;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return Promise.resolve(hit.url);
  const inflight = pending.get(key);
  if (inflight) return inflight;
  const p = new Promise<string | null>((resolve) => {
    let q = queues.get(ref.bucket);
    if (!q) { q = new Map(); queues.set(ref.bucket, q); queueMicrotask(() => flush(ref.bucket)); }
    const list = q.get(ref.path) ?? []; list.push(resolve); q.set(ref.path, list);
  }).finally(() => pending.delete(key));
  pending.set(key, p);
  return p;
}

export function clearMediaCache() { cache.clear(); }

const SIGNED_ATTR = "data-private-media";
const ATTRS = ["src", "poster", "href"] as const;

function fix(el: Element) {
  for (const attr of ATTRS) {
    const v = el.getAttribute(attr);
    if (!v || !parsePrivateMediaRef(v) || v.includes("/object/sign/")) continue;
    if (el.getAttribute(SIGNED_ATTR) === v) continue;
    el.setAttribute(SIGNED_ATTR, v);
    resolveMediaUrl(v).then((signed) => {
      if (el.getAttribute(attr) !== v) return;
      if (signed) el.setAttribute(attr, signed); else el.removeAttribute(attr);
    });
  }
}

/** Swaps any stored private-bucket link rendered in <video>, <img>, <source> or <a> for a signed one. */
export function installPrivateMediaObserver(root: Node = document.body): () => void {
  const sel = "video,img,source,a,audio";
  const scan = (n: Node) => {
    if (!(n instanceof Element)) return;
    if (n.matches(sel)) fix(n);
    n.querySelectorAll?.(sel).forEach(fix);
  };
  scan(root);
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "attributes") fix(m.target as Element);
      else m.addedNodes.forEach(scan);
    }
  });
  mo.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: [...ATTRS] });
  return () => mo.disconnect();
}

let patched = false;
/**
 * Off-screen <video>/<audio> elements and direct downloads (thumbnails, frame
 * extraction, pose, PDFs) also get signed links: assignments to `media.src`
 * and `fetch()` calls naming a private-bucket link are signed first.
 */
export function installPrivateMediaPatches() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  const desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");
  if (desc?.set && desc.get) {
    Object.defineProperty(HTMLMediaElement.prototype, "src", {
      configurable: true,
      get() { return desc.get!.call(this); },
      set(v: string) {
        if (!parsePrivateMediaRef(v) || String(v).includes("/object/sign/")) { desc.set!.call(this, v); return; }
        resolveMediaUrl(v).then((s) => desc.set!.call(this, s ?? ""));
      },
    });
  }
  const orig = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const u = typeof input === "string" ? input : input instanceof URL ? input.href : null;
    if (u && parsePrivateMediaRef(u) && !u.includes("/object/sign/") && (!init?.method || init.method === "GET")) {
      const s = await resolveMediaUrl(u);
      if (!s) return new Response(null, { status: 403 });
      return orig(s, init);
    }
    return orig(input as RequestInfo, init);
  }) as typeof fetch;
}
