import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { branding } from "@/branding";
import "./LaunchOpening.css";

// Per document launch, not per route visit. Reloading the app resets this flag.
let playedThisLaunch = false;

export function LaunchOpening() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(() => {
    if (playedThisLaunch || window.location.pathname !== "/") return false;
    playedThisLaunch = true;
    return true;
  });

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), 1450);
    const ready = () => setVisible(false);
    window.addEventListener("hm:landing-ready", ready);
    return () => { window.clearTimeout(timer); window.removeEventListener("hm:landing-ready", ready); };
  }, [visible]);

  if (!visible || pathname !== "/") return null;

  return (
    <div className="hm-launch" aria-hidden="true" onPointerDown={() => setVisible(false)}>
      <div className="hm-launch-stage">
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} className={`hm-launch-tile hm-launch-tile-${i % 6}`} style={{ animationDelay: `${i * 34}ms` }} />
        ))}
        <div className="hm-launch-mark">
          <img src={branding.logo} alt="" />
          <span>HAMMERS<br />MODALITY</span>
        </div>
      </div>
    </div>
  );
}