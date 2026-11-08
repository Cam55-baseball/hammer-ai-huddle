import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useOptionalAuth } from "@/hooks/useAuth";

/**
 * Release A (owner Nov 8): starts iPhone push registration, push-tap navigation and the
 * Apple Health sync inside the native app only. Renders nothing; on the web it does nothing.
 */
export function NativeBridge() {
  const auth = useOptionalAuth() as any;
  const navigate = useNavigate();
  const userId: string | null = auth?.user?.id ?? null;
  const ready = !auth?.loading;
  useEffect(() => {
    let native = false;
    try { native = Capacitor.isNativePlatform(); } catch { native = false; }
    if (!native || !ready) return;
    void import("@/lib/native/bridge").then((m) => m.startNativeFeatures(userId, (path) => navigate(path)));
  }, [userId, ready, navigate]);
  return null;
}
