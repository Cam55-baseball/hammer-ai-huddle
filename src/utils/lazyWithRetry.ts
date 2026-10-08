// Centralized lazy loader with retry. It never reloads the athlete's screen:
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

export function triggerChunkReload(reason: string): boolean {
  console.warn("[chunk-recovery] reload suppressed to preserve athlete work:", reason);
  return false;
}

export function clearChunkReloadGuard(): void {}

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
    if (isChunkLoadError(lastError)) triggerChunkReload("lazyWithRetry exhausted");
    throw lastError ?? new Error("Failed to load module after retries");
  });
}
