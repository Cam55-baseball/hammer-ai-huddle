import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { NotificationPrimer } from "@/components/onboarding/NotificationPrimer";
import { askedBefore, phonePushState, rememberAsked, shouldOfferExistingPrompt } from "@/lib/native/pushPermission";

/**
 * Owner Nov 12 (build 13 fix 3): the existing "Stay in the loop" prompt, once, for a signed-in
 * person in the iPhone app whose notification permission iOS hasn't asked yet (native_push_v1 on).
 * Mounted only inside the native app by NativeBridge.
 */
export function ExistingPlayerPushPrompt({ userId }: { userId: string }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (checked || open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const [state, asked] = await Promise.all([phonePushState(userId), askedBefore(userId)]);
      if (cancelled) return;
      if (shouldOfferExistingPrompt({ state, askedBefore: asked, path: pathname })) {
        await rememberAsked(userId, "shown"); // one ask, even if the app closes while it is open
        setOpen(true);
      }
      if (state !== "not_asked" || asked) setChecked(true);
    }, 2500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [userId, pathname, checked, open]);
  if (!open) return null;
  return <NotificationPrimer uid={userId} open={open} onDone={() => { setOpen(false); setChecked(true); }} />;
}
