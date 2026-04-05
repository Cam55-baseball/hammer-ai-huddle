import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const TexVisionDrillScene: React.FC<{
  simData: { targetSequence: string[]; reactionTimes: number[]; accuracy: number };
}> = ({ simData }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { targetSequence = ["FB", "CB", "SL", "CH"], reactionTimes = [420, 380, 510, 350], accuracy = 87 } = simData;

  const titleEntry = spring({ frame, fps, config: { damping: 20, stiffness: 180 } });

  // Accuracy ring
  const ringEntry = spring({ frame: frame - 30, fps, config: { damping: 25, stiffness: 90 } });
  const ringDash = interpolate(ringEntry, [0, 1], [0, (accuracy / 100) * 283]);

  // Average reaction
  const avgReaction = reactionTimes.length > 0
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    : 0;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(145deg, #0d0d1a 0%, #1a0a2e 50%, #0d0d1a 100%)",
        fontFamily: "sans-serif",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Title */}
      <div style={{
        position: "absolute", top: 80, width: "100%", textAlign: "center",
        opacity: interpolate(titleEntry, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(titleEntry, [0, 1], [-40, 0])}px)`,
      }}>
        <div style={{ fontSize: 24, color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          TEX VISION
        </div>
        <div style={{ fontSize: 44, fontWeight: 800, color: "#fff", marginTop: 4 }}>
          PITCH RECOGNITION DRILL
        </div>
      </div>

      {/* Targets grid */}
      <div style={{ display: "flex", gap: 20, marginTop: -40 }}>
        {targetSequence.slice(0, 4).map((target, i) => {
          const delay = 15 + i * 18;
          const appear = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 200 } });
          const scale = interpolate(appear, [0, 1], [0, 1]);
          const op = interpolate(appear, [0, 1], [0, 1]);

          // Flash effect
          const flashFrame = delay + 20;
          const flash = frame >= flashFrame && frame < flashFrame + 8
            ? interpolate(frame, [flashFrame, flashFrame + 8], [1, 0], { extrapolateRight: "clamp" })
            : 0;

          const colors: Record<string, string> = { FB: "#ef4444", CB: "#3b82f6", SL: "#f59e0b", CH: "#22c55e" };
          const color = colors[target] || "#8b5cf6";

          return (
            <div key={i} style={{
              width: 120, height: 120,
              borderRadius: "50%",
              border: `3px solid ${color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column",
              opacity: op,
              transform: `scale(${scale})`,
              background: `rgba(${flash > 0 ? "255,255,255" : "255,255,255"},${0.04 + flash * 0.3})`,
              boxShadow: flash > 0 ? `0 0 30px ${color}` : "none",
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color }}>{target}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                {reactionTimes[i] || "—"}ms
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div style={{
        position: "absolute", bottom: 120,
        display: "flex", gap: 60, alignItems: "center",
        justifyContent: "center", width: "100%",
      }}>
        {/* Accuracy ring */}
        <div style={{ position: "relative", width: 140, height: 140 }}>
          <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="#a855f7" strokeWidth="5"
              strokeDasharray="283" strokeDashoffset={283 - ringDash} strokeLinecap="round" />
          </svg>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#a855f7" }}>
              {Math.round(interpolate(ringEntry, [0, 1], [0, accuracy]))}%
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Accuracy</div>
          </div>
        </div>

        {/* Avg reaction */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 48, fontWeight: 800, color: "#fff",
            opacity: interpolate(ringEntry, [0, 1], [0, 1]),
          }}>
            {Math.round(interpolate(ringEntry, [0, 1], [0, avgReaction]))}
            <span style={{ fontSize: 20, color: "rgba(255,255,255,0.4)" }}>ms</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Avg Reaction
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
