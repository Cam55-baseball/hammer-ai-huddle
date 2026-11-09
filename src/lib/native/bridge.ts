/**
 * iPhone-app startup for Release A. Loaded only inside the native app (see NativeBridge),
 * so the website never downloads or runs any of it.
 */
import { App } from "@capacitor/app";
import { installPushListeners, registerIfAllowed } from "./push";
import { loadNativeFlags } from "./nativeFlags";
import { maybeSyncAppleHealth } from "./healthSync";
import { loadHealthWriteSwitch } from "./healthWorkouts";

let resumeInstalled = false;
let currentUser: string | null = null;

export async function startNativeFeatures(userId: string | null, navigate: (path: string) => void) {
  installPushListeners(navigate);
  currentUser = userId;
  if (!userId) return;
  await loadNativeFlags(userId);
  await loadHealthWriteSwitch(userId);
  void registerIfAllowed(userId);
  void maybeSyncAppleHealth(userId, { force: true });
  if (!resumeInstalled) {
    resumeInstalled = true;
    void App.addListener("resume", () => {
      if (!currentUser) return;
      void registerIfAllowed(currentUser);
      void maybeSyncAppleHealth(currentUser);
    });
  }
}
