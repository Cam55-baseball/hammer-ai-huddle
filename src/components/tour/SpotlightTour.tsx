/**
 * SpotlightTour — phone-first guided walkthrough.
 *
 * Cutout architecture: a full-screen layer applies `backdrop-filter: blur()`
 * and is masked by an inline SVG (`mask-image` + `-webkit-mask-image`). The SVG
 * is one even-odd path: the viewport is opaque (blur visible) and a rounded
 * rect at the target bounds is a transparent hole (masks use alpha), so the hole is genuinely sharp while the
 * rest is genuinely blurred — a box-shadow cutout cannot blur. A second,
 * unmasked-equivalent dim layer uses the same mask. Geometry is recomputed
 * via ResizeObserver on the target plus rAF-throttled scroll/resize listeners
 * (capture phase, so nested scroll containers are covered). Bounds are
 * animated with Framer Motion springs; reduced motion fades instead.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion, useSpring } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TourStep {
  id: string;
  /** CSS selector, preferably `[data-tour="..."]`. */
  target: string;
  title: string;
  body: string;
  /** Optional permission check; false skips the step silently. */
  allowed?: () => boolean;
  /** Page the target lives on; the tour navigates there first. Missing target after load → skipped. */
  /** Page the target lives on. A function is resolved when the step is reached (e.g. from a link on the previous page); undefined → step skipped. */
  route?: string | (() => string | undefined);
}

interface Props {
  tourId: string;
  steps: TourStep[];
  open: boolean;
  onClose: (result: "completed" | "skipped") => void;
  /** Signed-in user; seen/skipped is remembered per user. */
  userId?: string | null;
  /** Router hooks for multi-page tours. */
  navigate?: (to: string, options?: { replace?: boolean; state?: unknown }) => void;
  currentPath?: string;
}

const PAD = 12;
const RADIUS = 14;
const STORAGE_PREFIX = "hm-tour:";
const EXIT_RESERVED_PX = 76;

export function tourSeen(tourId: string, userId?: string | null) {
  try { return !!localStorage.getItem(`${STORAGE_PREFIX}${userId ?? "anon"}:${tourId}`); } catch { return false; }
}
export function markTour(tourId: string, result: "completed" | "skipped", userId?: string | null) {
  try { localStorage.setItem(`${STORAGE_PREFIX}${userId ?? "anon"}:${tourId}`, JSON.stringify({ result, at: Date.now() })); } catch { /* storage unavailable */ }
}

function findTarget(sel: string): HTMLElement | null {
  // First VISIBLE match — a selector list can hit a hidden heading first.
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (r.width > 0 && r.height > 0 && style.visibility !== "hidden" && style.display !== "none") return el;
  }
  return null;
}

/**
 * A bare heading or tiny label is hard to recognise in isolation. Prefer its
 * explicitly-marked context, then its compact parent. If a selected section is
 * taller than a phone screen, use its heading area rather than cutting the
 * section in half.
 */
function contextualTarget(el: HTMLElement): HTMLElement {
  const explicit = el.closest<HTMLElement>("[data-tour-context]");
  if (explicit) return explicit;
  const rect = el.getBoundingClientRect();
  const tooTall = rect.height > window.innerHeight * 0.42;
  const isHeading = /^H[1-6]$/.test(el.tagName);
  const heading = tooTall ? el.querySelector<HTMLElement>("h1, h2, h3") : null;
  const focus = heading ?? el;
  if (tooTall || isHeading || rect.height < 36 || rect.width < 100) {
    const parent = focus.parentElement;
    if (parent) {
      const pr = parent.getBoundingClientRect();
      if (pr.height > 0 && pr.height <= window.innerHeight * 0.42) return parent;
    }
  }
  return focus;
}

function maskUrl(w: number, h: number, x: number, y: number, rw: number, rh: number) {
  // CSS masks use ALPHA by default: an even-odd path leaves the hole fully
  // transparent (no blur) and the rest opaque (blurred), in every engine.
  const r = Math.min(RADIUS, rw / 2, rh / 2);
  const hole = `M${x + r},${y}H${x + rw - r}A${r},${r} 0 0 1 ${x + rw},${y + r}V${y + rh - r}A${r},${r} 0 0 1 ${x + rw - r},${y + rh}H${x + r}A${r},${r} 0 0 1 ${x},${y + rh - r}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}Z`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><path fill-rule='evenodd' fill='white' d='M0,0H${w}V${h}H0Z ${hole}'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

export function SpotlightTour({ tourId, steps, open, onClose, userId, navigate, currentPath }: Props) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const targetRef = useRef<HTMLElement | null>(null);
  const frame = useRef<number | null>(null);
  const openingPath = useRef<string | null>(null);
  const historyArmed = useRef(false);
  const closing = useRef(false);

  const finish = useCallback((result: "completed" | "skipped", restoreOpeningPage = true) => {
    if (closing.current) return;
    closing.current = true;
    markTour(tourId, result, userId);
    const origin = openingPath.current;
    const markerIsCurrent = !!(window.history.state?.usr?.hmTour);
    if (restoreOpeningPage && markerIsCurrent) {
      window.history.back();
    } else if (restoreOpeningPage && origin && navigate && currentPath !== origin) {
      navigate(origin, { replace: true });
    }
    onClose(result);
  }, [currentPath, navigate, onClose, tourId, userId]);

  // Only steps that are permitted AND present; recomputed on open.
  // Permitted steps; same-page steps must be present now, routed steps are
  // checked after navigation and dropped silently if absent (progress shrinks).
  const [active, setActive] = useState<TourStep[]>([]);
  const [ready, setReady] = useState(false);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && wasOpen.current) return; // keep the live list mid-tour
    wasOpen.current = open;
    if (open) {
      closing.current = false;
      openingPath.current = currentPath ?? `${window.location.pathname}${window.location.search}`;
      historyArmed.current = true;
      const state = window.history.state ?? {};
      const usr = typeof state.usr === "object" && state.usr ? state.usr : {};
      const { hmTour: _staleTourMarker, ...cleanUsr } = usr as Record<string, unknown>;
      window.history.replaceState({ ...state, usr: cleanUsr }, "", window.location.href);
      window.history.pushState({ ...state, usr: { ...cleanUsr, hmTour: true } }, "", window.location.href);
    } else {
      historyArmed.current = false;
    }
    resolved.current = {};
    setReady(open);
    setActive(open ? steps.filter((s) => (s.allowed ? s.allowed() : true) && (s.route ? true : !!findTarget(s.target))) : []);
  }, [open, steps, currentPath]);
  useEffect(() => { if (index > 0 && index >= active.length) setIndex(active.length - 1); }, [active.length, index]);
  const step = active[index];
  const [foundId, setFoundId] = useState<string | null>(null);
  const resolved = useRef<Record<string, string | undefined>>({});
  const navigatedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !step) return;
    setFoundId(null);
    // Wait for the page to actually change before looking — the old page's
    // headings would otherwise match and then vanish.
    const route = typeof step.route === "function" ? (resolved.current[step.id] ??= step.route()) : step.route;
    if (typeof step.route === "function" && !route) { setActive((a) => a.filter((x) => x.id !== step.id)); return; }
    if (route && navigate && (currentPath ?? "").split("?")[0] !== route.split("?")[0]) {
      // Navigate once per step. If the page redirects away (viewer can't use it),
      // the step is dropped silently instead of waiting forever.
      if (navigatedFor.current !== step.id) { navigatedFor.current = step.id; navigate(route, { replace: true, state: { hmTour: true } }); }
      const id = window.setTimeout(() => setActive((a) => a.filter((x) => x.id !== step.id)), 8000);
      return () => window.clearTimeout(id);
    }
    let raf = 0; const t0 = performance.now();
    const poll = () => {
      if (findTarget(step.target)) {
        // Capture later link-derived routes while their links are on screen.
        for (const later of active.slice(index + 1)) {
          if (typeof later.route === "function" && !resolved.current[later.id]) {
            const r = later.route(); if (r) resolved.current[later.id] = r;
          }
        }
        navigatedFor.current = null; setFoundId(step.id); return;
      }
      if (performance.now() - t0 > 12000) {
        // Drop it; the next step slides into this index and the count shrinks.
        setActive((a) => a.filter((x) => x.id !== step.id));
        return;
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step?.id, (currentPath ?? "").split("?")[0]]);

  const spring = { stiffness: 260, damping: 30 };
  const sx = useSpring(0, spring), sy = useSpring(0, spring), sw = useSpring(0, spring), sh = useSpring(0, spring);
  const [m, setM] = useState({ x: 0, y: 0, w: 0, h: 0 });
  useEffect(() => {
    const u = () => setM({ x: sx.get(), y: sy.get(), w: sw.get(), h: sh.get() });
    const subs = [sx.on("change", u), sy.on("change", u), sw.on("change", u), sh.on("change", u)];
    return () => subs.forEach((f) => f());
  }, [sx, sy, sw, sh]);

  const measure = useCallback(() => {
    if (frame.current != null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setVp({ w: window.innerWidth, h: window.innerHeight });
      const el = targetRef.current;
      if (!el || !el.isConnected) { setRect(null); return; }
      const nr = el.getBoundingClientRect();
      setRect(nr);
    });
  }, []);

  useEffect(() => { if (open) setIndex(0); }, [open]);

  // Locate, scroll into view, wait for settle, then illuminate.
  useLayoutEffect(() => {
    if (!open) return;
    if (!step) { if (ready && active.length === 0) finish("completed"); return; }
    if (foundId !== step.id) return;
    const raw = findTarget(step.target);
    if (!raw) { // vanished since filtering — skip gracefully
      setActive((a) => a.filter((x) => x.id !== step.id));
      return;
    }
    const el = contextualTarget(raw);
    targetRef.current = el;
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
    // Wait until BOTH axes hold still for several frames (outer page and any
    // nested scroll container finish their smooth scroll), then illuminate.
    let last = el.getBoundingClientRect(), still = 0, raf = 0;
    const settle = () => {
      const r = el.getBoundingClientRect();
      still = Math.abs(r.top - last.top) < 0.5 && Math.abs(r.left - last.left) < 0.5 ? still + 1 : 0; last = r;
      if (still >= 8) measure(); else raf = requestAnimationFrame(settle);
    };
    raf = requestAnimationFrame(settle);
    const ro = new ResizeObserver(measure); ro.observe(el);
    // Safety net: some movements (nested smooth scroll finishing, layout
    // shifts from late content) emit no event we can hear. A light per-frame
    // check re-measures only when the target actually moved.
    let watch = 0, prev = el.getBoundingClientRect();
    const watchLoop = () => {
      const r = el.getBoundingClientRect();
      if (Math.abs(r.top - prev.top) > 0.5 || Math.abs(r.left - prev.left) > 0.5 || Math.abs(r.width - prev.width) > 0.5 || Math.abs(r.height - prev.height) > 0.5) { prev = r; measure(); }
      watch = requestAnimationFrame(watchLoop);
    };
    watch = requestAnimationFrame(watchLoop);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("scrollend", measure, true);
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(raf); cancelAnimationFrame(watch); ro.disconnect(); window.removeEventListener("scroll", measure, true); window.removeEventListener("scrollend", measure, true); window.removeEventListener("resize", measure); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step?.id, foundId]);

  useEffect(() => {
    if (!rect) return;
    // The target is context-sized before this point. The mask follows its full
    // rendered bounds; viewport edges are the only clipping boundary.
    const vw = window.innerWidth, vh = window.innerHeight;
    const x0 = Math.max(4, rect.left - PAD), y0 = Math.max(4, rect.top - PAD);
    const x1 = Math.min(vw - 4, rect.right + PAD), y1 = Math.min(vh - EXIT_RESERVED_PX, rect.bottom + PAD);
    const vals = [x0, y0, Math.max(24, x1 - x0), Math.max(24, y1 - y0)];
    [sx, sy, sw, sh].forEach((s, i) => (reduce ? s.jump(vals[i]) : s.set(vals[i])));
  }, [rect, reduce, sx, sy, sw, sh]);

  const next = () => (index + 1 < active.length ? setIndex(index + 1) : finish("completed"));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") finish("skipped"); if (e.key === "ArrowRight") next(); if (e.key === "ArrowLeft") back(); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });

  useLayoutEffect(() => {
    if (!open) return;
    const onBack = () => {
      if (!historyArmed.current) return;
      finish("skipped", false);
    };
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, [finish, open]);

  if (!open) return null;

  const showingStep = !!step && foundId === step.id && !!rect;

  // Edge-aware coach mark: prefer below, flip above, clamp horizontally.
  const cardW = Math.min(340, Math.max(280, vp.w - 24));
  const cardH = Math.min(360, Math.round((vp.h - EXIT_RESERVED_PX) * 0.46));
  const below = m.y + m.h + 12;
  const usableBottom = vp.h - EXIT_RESERVED_PX;
  const roomBelow = usableBottom - below - 12;
  const roomAbove = m.y - 24;
  const placeAbove = roomAbove > roomBelow;
  const available = Math.max(164, placeAbove ? roomAbove : roomBelow);
  const fittedCardH = Math.min(cardH, available);
  const top = Math.max(12, Math.min(placeAbove ? m.y - fittedCardH - 12 : below, usableBottom - fittedCardH - 12));
  const left = Math.max(12, Math.min(m.x + m.w / 2 - cardW / 2, vp.w - cardW - 12));
  const mask = showingStep && vp.w ? maskUrl(vp.w, vp.h, m.x, m.y, m.w, m.h) : undefined;
  const layer = { maskImage: mask, WebkitMaskImage: mask, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" } as React.CSSProperties;

  // Portal to <body>: an ancestor with a transform (page transitions) would
  // otherwise make `fixed` relative to it and offset the cutout.
  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={step?.title ?? "Demo tour"} data-testid="spotlight-tour">
      <motion.div
        className="absolute inset-0 bg-background/60 backdrop-blur-md"
        style={layer}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}
        onClick={() => finish("skipped")}
        data-testid="spotlight-tour-backdrop"
      />
      {showingStep && <div
        className="pointer-events-none absolute rounded-[14px] ring-2 ring-primary/80 shadow-[0_0_24px_hsl(var(--primary)/0.45)]"
        style={{ left: m.x, top: m.y, width: m.w, height: m.h }}
      />}
      <AnimatePresence mode="wait">
        {showingStep && <motion.div
          key={step.id}
          className="absolute flex flex-col rounded-2xl border border-primary/30 bg-card/95 p-4 text-card-foreground shadow-2xl backdrop-blur-xl"
          style={{ top, left, width: cardW, maxHeight: fittedCardH }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: placeAbove ? -8 : 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div className="mb-2 flex items-center gap-1.5" aria-label={`Step ${index + 1} of ${active.length}`}>
            {active.map((s, i) => (
              <span key={s.id} className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-primary" : i < index ? "w-1.5 bg-primary/60" : "w-1.5 bg-muted"}`} />
            ))}
            <span className="ml-auto text-xs text-muted-foreground">{index + 1} / {active.length}</span>
          </div>
          <h3 className="text-base font-bold">{step.title}</h3>
          <p className="mt-1 min-h-0 flex-1 overflow-y-auto text-sm text-muted-foreground">{step.body}</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="ml-auto flex gap-2">
              {index > 0 && <Button variant="outline" size="sm" className="min-h-11 transition-transform hover:scale-105" onClick={back}>Back</Button>}
              <Button size="sm" className="min-h-11 transition-transform hover:scale-105" onClick={next}>{index + 1 === active.length ? "Done" : "Next"}</Button>
            </div>
          </div>
        </motion.div>}
      </AnimatePresence>
      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-[calc(0.75rem+var(--safe-left))] pb-[calc(0.75rem+var(--safe-bottom))] pt-2 backdrop-blur-xl">
        <Button
          variant="outline"
          size="lg"
          className="min-h-12 w-full text-base font-bold"
          onClick={() => finish("skipped")}
          autoFocus
        >
          <X className="h-5 w-5" /> Exit demo
        </Button>
      </div>
    </div>,
    document.body,
  );
}
