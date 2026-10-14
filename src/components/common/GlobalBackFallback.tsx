/**
 * No dead ends: on any screen that has no visible way back (Back, Close, Cancel, Exit,
 * or a Dashboard link — the sidebar menu doesn't count), show a small fixed Back button.
 * The automated navigation test (tests/e2e/navigation/back_everywhere.py) uses the same rule.
 */
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { BackButton } from "@/components/common/BackButton";
import { useOptionalAuth } from "@/hooks/useAuth";

const HOME = new Set(["/", "/dashboard", "/index", "/auth", "/signup"]);
export const WAY_BACK_SELECTOR =
  '[data-nav-back], a[href="/dashboard"], a[href="/"], button[aria-label*="back" i], button[aria-label*="close" i], a[aria-label*="back" i]';
const WAY_BACK_TEXT = /^(back|close|cancel|exit|done|save & exit|go back|back to .+|←.*)$/i;

export function hasWayBack(root: ParentNode = document): boolean {
  const visible = (el: Element) => { const r = (el as HTMLElement).getBoundingClientRect?.(); return !!r && r.width > 0 && r.height > 0; };
  if (Array.from(root.querySelectorAll(WAY_BACK_SELECTOR)).some((el) => visible(el) && !el.closest("[data-global-back]"))) return true;
  return Array.from(root.querySelectorAll("button, a")).some((el) => visible(el) && !el.closest("[data-global-back]") && WAY_BACK_TEXT.test((el.textContent ?? "").trim()));
}

export function GlobalBackFallback() {
  const { pathname } = useLocation();
  const { user } = useOptionalAuth() as any;
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(false);
    if (HOME.has(pathname)) return;
    const check = () => setShow(!hasWayBack());
    const t = window.setTimeout(check, 900);
    // Re-check every second (cheap) so screens that load late or open in steps are covered too.
    const iv = window.setInterval(check, 1000);
    return () => { window.clearTimeout(t); window.clearInterval(iv); };
  }, [pathname]);
  if (!show) return null;
  return (
    <div data-global-back className="fixed left-2 top-[calc(0.5rem+var(--safe-top,0px))] z-[60] rounded-full border bg-background/95 shadow-md backdrop-blur">
      <BackButton fallback={user ? "/dashboard" : "/"} className="ml-0 px-3" />
    </div>
  );
}
