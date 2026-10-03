import { useEffect, useState } from "react";
import { branding } from "@/branding";

// Per document launch, not per route visit. Reloading the app resets this flag.
let playedThisLaunch = false;

export function LaunchOpening() {
  const [visible, setVisible] = useState(() => {
    if (playedThisLaunch) return false;
    playedThisLaunch = true;
    return true;
  });

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), 1450);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

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