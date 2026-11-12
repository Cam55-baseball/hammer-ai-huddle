/**
 * Owner Nov 12 (build 13 fix 4): which app build and which screens are running.
 * - Account settings shows one small line (app build on iPhone; screens' build time everywhere).
 * - Opening the iPhone app while signed in saves one "last seen" row per user and platform
 *   (record_app_build_seen; latest wins; owner/admin can read).
 */
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";

/** ISO time the screens were built (stamped by the web build), or null in tests/dev tools without it. */
export function screensBuiltAt(): string | null {
  try { return typeof __BUILD_TIME__ === "string" && __BUILD_TIME__ ? __BUILD_TIME__ : null; } catch { return null; }
}

export interface AppInfo { version: string | null; build: string | null }

export async function nativeAppInfo(): Promise<AppInfo | null> {
  try {
    if (!Capacitor.isNativePlatform()) return null;
    const i = await App.getInfo();
    return { version: i.version ?? null, build: i.build ?? null };
  } catch { return null; }
}

/** "App build 13 (1.0) · Screens built Nov 12, 2026, 4:40 PM" — the screens' time in the person's own time zone. */
export function buildInfoLine(app: AppInfo | null, builtAtIso: string | null, timeZone?: string): string {
  const parts: string[] = [];
  if (app?.build) parts.push(`App build ${app.build}${app.version ? ` (${app.version})` : ""}`);
  const d = builtAtIso ? new Date(builtAtIso) : null;
  parts.push(d && !isNaN(d.getTime())
    ? `Screens built ${d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", ...(timeZone ? { timeZone } : {}) })}`
    : "Screens build time not recorded");
  return parts.join(" · ");
}

/** Saves this person's latest iPhone build + screens' build time. Never blocks the app. */
export async function recordBuildSeen(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  let platform: string;
  try { if (!Capacitor.isNativePlatform()) return false; platform = Capacitor.getPlatform(); } catch { return false; }
  if (platform !== "ios" && platform !== "android") return false;
  const app = await nativeAppInfo();
  const { error } = await supabase.rpc("record_app_build_seen" as any, {
    _platform: platform, _app_version: app?.version ?? null, _app_build: app?.build ?? null, _web_built_at: screensBuiltAt(),
  } as any);
  if (error) console.warn("[build] last seen not saved", error.message);
  return !error;
}
