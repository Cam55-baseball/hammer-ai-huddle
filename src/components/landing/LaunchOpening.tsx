import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import baseball from "@/assets/launch-baseball.png";
import bat from "@/assets/launch-bat.png";
import "./LaunchOpening.css";

const FIRST_LAUNCH_KEY = "hm.launchOpening.fullSeen.v1";
let playedThisLaunch = false;
const artworkReady = Promise.all([baseball, bat].map((source) => {
  const image = new Image();
  image.src = source;
  return image.decode().catch(() => undefined);
}));

export function LaunchOpening() {
  const { pathname } = useLocation();
  const [mode] = useState<"full" | "short">(() => {
    try { return window.localStorage.getItem(FIRST_LAUNCH_KEY) === "yes" ? "short" : "full"; }
    catch { return "full"; }
  });
  const [visible, setVisible] = useState(() => {
    if (playedThisLaunch || window.location.pathname !== "/") return false;
    playedThisLaunch = true;
    return true;
  });
  const [ready, setReady] = useState(false);
  const [hit, setHit] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const onReady = () => setReady(true);
    window.addEventListener("hm:landing-ready", onReady);
    // Index may have committed before the listener is installed.
    if (document.querySelector("[data-hm-landing]")) setReady(true);
    return () => window.removeEventListener("hm:landing-ready", onReady);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    void artworkReady.then(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [visible]);

  useEffect(() => {
    if (!visible || !loaded) return;
    const timer = window.setTimeout(() => setHit(true), mode === "full" ? 4400 : 2150);
    return () => window.clearTimeout(timer);
  }, [visible, loaded, mode]);

  useEffect(() => {
    if (skipped && ready) setVisible(false);
  }, [skipped, ready]);

  useEffect(() => {
    if (!hit || !ready || !visible) return;
    setExiting(true);
    const timer = window.setTimeout(() => {
      if (mode === "full") {
        try { window.localStorage.setItem(FIRST_LAUNCH_KEY, "yes"); } catch { /* Storage unavailable: replay the full opening next launch. */ }
      }
      setVisible(false);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [hit, ready, visible, mode]);

  if (!visible || pathname !== "/") return null;

  const skip = () => {
    if (mode !== "short") return;
    setSkipped(true);
  };

  return (
    <div className={`hm-launch hm-launch--${mode}${loaded ? " hm-launch--loaded" : ""}${exiting ? " hm-launch--exit" : ""}`} aria-label="Hammers Modality opening" role="presentation" onPointerDown={skip}>
      <div className="hm-launch-backdrop" />
      <div className="hm-launch-beam" />
      <div className="hm-launch-stage">
        <div className="hm-launch-title"><span>HAMMERS</span><span>MODALITY</span></div>
        <div className="hm-launch-ball-wrap">
          <img className="hm-launch-ball" src={baseball} width={1024} height={1024} alt="" />
        </div>
        <img className="hm-launch-bat" src={bat} width={1536} height={768} alt="" />
      </div>
      <div className="hm-launch-flash" />
    </div>
  );
}