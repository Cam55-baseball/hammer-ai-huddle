import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { AnimatedMetric } from "../components/AnimatedMetric";

interface MetricItem {
  name: string;
  value: number;
  grade: string;
}

export const MPIEngineScene: React.FC<{
  simData: { metrics: MetricItem[]; overallScore: number };
}> = ({ simData }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { metrics = [], overallScore = 0 } = simData;

  const titleEntry = spring({ frame, fps, config: { damping: 18, stiffness: 160 } });
  const titleY = interpolate(titleEntry, [0, 1], [-60, 0]);
  const titleOp = interpolate(titleEntry, [0, 1], [0, 1]);

  const scoreEntry = spring({ frame: frame - 20, fps, config: { damping: 14, stiffness: 120 } });
  const scoreScale = interpolate(scoreEntry, [0, 1], [0.2, 1]);
  const scoreOp = interpolate(scoreEntry, [0, 1], [0, 1]);

  const ringProgress = interpolate(
    spring({ frame: frame - 25, fps, config: { damping: 30, stiffness: 80 } }),
    [0, 1],
    [0, (overallScore / 100) * 283]
  );

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #0a0a1a 0%, #111133 50%, #0a0a1a 100%)",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "sans-serif",
      }}
    >
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 80,
          width: "100%",
          textAlign: "center",
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Modality Performance Index
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: "#ffffff", marginTop: 8 }}>
          MPI ENGINE
        </div>
      </div>

      {/* Central ring */}
      <div style={{ position: "relative", width: 200, height: 200, opacity: scoreOp, transform: `scale(${scoreScale})` }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke="#4f8cff"
            strokeWidth="6"
            strokeDasharray="283"
            strokeDashoffset={283 - ringProgress}
            strokeLinecap="round"
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <AnimatedMetric value={overallScore} delay={30} fontSize={56} color="#4f8cff" />
        </div>
      </div>

      {/* Metric cards */}
      <div style={{
        position: "absolute",
        bottom: 120,
        display: "flex",
        gap: 24,
        justifyContent: "center",
        width: "100%",
        padding: "0 40px",
        flexWrap: "wrap",
      }}>
        {metrics.slice(0, 4).map((m, i) => {
          const delay = 40 + i * 12;
          const entry = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 180 } });
          const y = interpolate(entry, [0, 1], [60, 0]);
          const op = interpolate(entry, [0, 1], [0, 1]);

          return (
            <div key={i} style={{
              opacity: op,
              transform: `translateY(${y}px)`,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 16,
              padding: "20px 28px",
              minWidth: 180,
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {m.name}
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#ffffff" }}>
                {Math.round(interpolate(entry, [0, 1], [0, m.value]))}
              </div>
              <div style={{
                fontSize: 18, fontWeight: 700, marginTop: 6,
                color: m.grade.startsWith("A") ? "#4ade80" : m.grade.startsWith("B") ? "#facc15" : "#f87171",
              }}>
                {m.grade}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
