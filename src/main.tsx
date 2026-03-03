import "./i18n";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "./registerSW";

// Force rebuild timestamp
console.log('[app] initialized', Date.now());

createRoot(document.getElementById("root")!).render(<App />);

registerSW();
