declare global {
  interface Window {
    __hammersProtectedEditingUntil?: number;
  }
}

const DEFAULT_PROTECTED_MS = 30_000;

function activeElementIsEditable(): boolean {
  if (typeof document === "undefined") return false;
  const active = document.activeElement as HTMLElement | null;
  if (!active) return false;
  const tagName = active.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    active.isContentEditable === true ||
    active.closest?.("[data-protected-editing='true']") !== null
  );
}

export function noteProtectedEditing(ms = DEFAULT_PROTECTED_MS): void {
  if (typeof window === "undefined") return;
  window.__hammersProtectedEditingUntil = Date.now() + ms;
}

export function clearProtectedEditing(): void {
  if (typeof window === "undefined") return;
  window.__hammersProtectedEditingUntil = 0;
}

export function isProtectedEditingActive(): boolean {
  if (activeElementIsEditable()) return true;
  if (typeof window === "undefined") return false;
  return (window.__hammersProtectedEditingUntil ?? 0) > Date.now();
}
