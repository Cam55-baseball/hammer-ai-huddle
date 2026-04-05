import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const VaultProgressScene: React.FC<{
  simData: { beforeLabel: string; afterLabel: string; progressPercent: number; timeframe: string };
}> = ({ simData }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { beforeLabel = "Day 1", afterLabel = "Day 90", progressPercent = 78, timeframe = "3 Months" } = simData;

  const headerEntry = spring({ frame, fps, config: { damping: 20, stiffness: 160 } });
  const leftSlide = spring({ frame: frame - 15, fps, config: { damping: 18, stiffness: 140 } });
  const rightSlide = spring({ frame: frame - 25, fps, config: { damping: 18, stiffness: 140 } });
  const barFill = spring({ frame: frame - 40, fps, config: { damping: 30, stiffness: 60 } });
  const barWidth = interpolate(barFill, [0, 1], [0, progressPercent]);

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(155deg, #0a1628 0%, #0f2040 50%, #0a1628 100%)",
        fontFamily: "sans-serif",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Header */}
      <div style={{
        position: "absolute", top: 80, width: "100%", textAlign: "center",
        opacity: interpolate(headerEntry, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(headerEntry, [0, 1], [-30, 0])}px)`,
      }}>
        <div style={{ fontSize: 22, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Progress Vault
        </div>
        <div style={{ fontSize: 42, fontWeight: 800, color: "#fff", marginTop: 8 }}>
          YOUR TRANSFORMATION
        </div>
      </div>

      {/* Before / After comparison */}
      <div style={{ display: "flex", gap: 40, alignItems: "center", marginTop: -20 }}>
        {/* Before */}
        <div style={{
          opacity: interpolate(leftSlide, [0, 1], [0, 1]),
          transform: `translateX(${interpolate(leftSlide, [0, 1], [-80, 0])}px)`,
          textAlign: "center",
        }}>
          <div style={{
            width: 200, height: 260,
            borderRadius: 16,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 12,
          }}>
            <div style={{ fontSize: 48, opacity: 0.3 }}>📊</div>
            <div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)" }}>{beforeLabel}</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>Starting Point</div>
          </div>
        </div>

        {/* Arrow */}
        <div style={{
          fontSize: 40, color: "#22d3ee",
          opacity: interpolate(rightSlide, [0, 1], [0, 1]),
        }}>→</div>

        {/* After */}
        <div style={{
          opacity: interpolate(rightSlide, [0, 1], [0, 1]),
          transform: `translateX(${interpolate(rightSlide, [0, 1], [80, 0])}px)`,
          textAlign: "center",
        }}>
          <div style={{
            width: 200, height: 260,
            borderRadius: 16,
            background: "linear-gradient(135deg, rgba(34,211,238,0.1) 0%, rgba(59,130,246,0.1) 100%)",
            border: "1px solid rgba(34,211,238,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 12,
          }}>
            <div style={{ fontSize: 48 }}>🚀</div>
            <div style={{ fontSize: 16, color: "#22d3ee", fontWeight: 700 }}>{afterLabel}</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>Current Level</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        position: "absolute", bottom: 160,
        width: "70%", maxWidth: 600,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", marginBottom: 12,
          opacity: interpolate(barFill, [0, 1], [0, 1]),
        }}>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {timeframe} Progress
          </span>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#22d3ee" }}>
            {Math.round(barWidth)}%
          </span>
        </div>
        <div style={{
          height: 12, borderRadius: 6,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${barWidth}%`,
            borderRadius: 6,
            background: "linear-gradient(90deg, #22d3ee, #3b82f6)",
            boxShadow: "0 0 20px rgba(34,211,238,0.4)",
          }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
