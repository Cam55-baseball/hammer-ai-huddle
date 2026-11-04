import "./i18n";
import "./index.css";
import { registerSW } from "./registerSW";
import { restoreNativeSession } from "./lib/auth/nativeSessionStore";

// Browsers report "ResizeObserver loop completed with undelivered notifications"
// when a layout settles over two frames. It is harmless (nothing is lost), but
// error reporters treat it as a crash. Swallow only that exact message.
window.addEventListener("error", (e) => {
  if (typeof e.message === "string" && e.message.startsWith("ResizeObserver loop")) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
}, true);

// In the native iPhone app, restore the saved sign-in from native storage
// BEFORE the auth client loads (App imports it). On the web this is a no-op.
restoreNativeSession().finally(async () => {
  const [{ createRoot }, { default: App }] = await Promise.all([
    import("react-dom/client"),
    import("./App.tsx"),
  ]);
  createRoot(document.getElementById("root")!).render(<App />);
  registerSW();
  // Private media: stored links play only through short-lived signed URLs.
  const { installPrivateMediaObserver, installPrivateMediaPatches } = await import("./lib/media/privateMedia");
  installPrivateMediaPatches();
  installPrivateMediaObserver();
  const { installNativeStorefront } = await import("./lib/purchase/nativeStorefront");
  installNativeStorefront();
  // iPhone/iPad: finish Apple sign-in returned from the in-app browser sheet.
  const { installNativeOAuthListener } = await import("./lib/auth/nativeOAuth");
  installNativeOAuthListener((path) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
});
