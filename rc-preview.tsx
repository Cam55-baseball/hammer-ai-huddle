import React from "react";
import { createRoot } from "react-dom/client";
import "./src/index.css";
import { HammerReportCard } from "./src/components/report-card/hammer/HammerReportCard";
const a: any = { efficiency_score: 72, feedback: "", drills: [], metrics: { shoulder_tilt_deg: { value: 27, confidence: 0.9 } }, tempo_sec_deterministic: { value: 0.94 } };
createRoot(document.getElementById("root")!).render(
  <div style={{ padding: 24, display: "grid", gap: 24 }}>
    <HammerReportCard sport="baseball" module="pitching" analysis={a} showShare={false} />
    <HammerReportCard sport="baseball" module="hitting" analysis={a} showShare={false} />
  </div>,
);
