import "./i18n";
import "./index.css";
import { registerSW } from "./registerSW";
import { restoreNativeSession } from "./lib/auth/nativeSessionStore";

// In the native iPhone app, restore the saved sign-in from native storage
// BEFORE the auth client loads (App imports it). On the web this is a no-op.
restoreNativeSession().finally(async () => {
  const [{ createRoot }, { default: App }] = await Promise.all([
    import("react-dom/client"),
    import("./App.tsx"),
  ]);
  createRoot(document.getElementById("root")!).render(<App />);
  registerSW();
  // iPhone/iPad: finish Apple sign-in returned from the in-app browser sheet.
  const { installNativeOAuthListener } = await import("./lib/auth/nativeOAuth");
  installNativeOAuthListener((path) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
});
