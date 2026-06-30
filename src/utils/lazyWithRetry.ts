// Centralized lazy loader with retry + one-shot cache-busting reload recovery
// for stale chunk errors. Every dynamic import in the app MUST go through this
// helper so the user never sees a white screen after a deploy.
import { ComponentType, lazy } from "react";

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const e = error as { name?: string; message?: string };
  if (e.name === "ChunkLoadError") return true;
  const msg = String(e.message ?? error);
  return /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk \d+ failed|Loading CSS chunk/i.test(
    msg,
  );
}

const RELOAD_GUARD_KEY = "__chunk_reload_once";
export function triggerChunkReload(reason: string): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY) === "1") return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
  } catch {
    /* storage disabled — fall through and still try the reload */
  }
  console.warn("[chunk-recovery] reloading once due to:", reason);
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("_cb", Date.now().toString(36));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
  return true;
}

export function clearChunkReloadGuard(): void {
  try {
    sessionStorage.removeItem(RELOAD_GUARD_KEY);
  } catch {
    /* ignore */
  }
}

export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 3,
) {
  return lazy(async () => {
    let lastError: unknown;
    for (let i = 0; i < retries; i++) {
      try {
        return await componentImport();
      } catch (error) {
        lastError = error;
        console.warn(
          `Dynamic import failed (attempt ${i + 1}/${retries}):`,
          error,
        );
        if (i === retries - 1) break;
        await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
      }
    }
    if (isChunkLoadError(lastError)) {
      if (triggerChunkReload("lazyWithRetry exhausted")) {
        return await new Promise<{ default: T }>(() => {});
      }
    }
    throw lastError ?? new Error("Failed to load module after retries");
  });
}
