import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useOptionalAuth } from "@/hooks/useAuth";
import { ExistingPlayerPushPrompt } from "./ExistingPlayerPushPrompt";

/**
 * Release A (owner Nov 8): starts iPhone push registration, push-tap navigation and the
 * Apple Health sync inside the native app only. Renders nothing; on the web it does nothing.
 */
export function NativeBridge() {
  const auth = useOptionalAuth() as any;
  const navigate = useNavigate();
  const userId: string | null = auth?.user?.id ?? null;
  const ready = !auth?.loading;
  const [native] = useState(() => { try { return Capacitor.isNativePlatform(); } catch { return false; } });
  useEffect(() => {
    if (!native || !ready) return;
    void import("@/lib/native/bridge").then((m) => m.startNativeFeatures(userId, (path) => navigate(path)));
  }, [native, userId, ready, navigate]);
  // Owner Nov 12 (build 13): existing players are asked once (iPhone app, native_push_v1 on).
  if (!native || !ready || !userId) return null;
  return <ExistingPlayerPushPrompt userId={userId} />;
}
