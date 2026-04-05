import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { PhoneMockup } from "../components/PhoneMockup";
import { AnimatedMetric } from "../components/AnimatedMetric";

type DashboardSimData = {
  mpiScore: number;
  grades: Record<string, string>;
  streak: number;
};

export const DashboardHeroScene: React.FC<{
  simData: Record<string, any>;
}> = ({ simData }) => {
  const data = simData as DashboardSimData;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const gradeEntries = Object.entries(data.grades || {});

  // MPI score counter
  const mpiSpring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 25, stiffness: 120 },
  });
  const mpiValue = Math.round(
    interpolate(mpiSpring, [0, 1], [0, data.mpiScore])
  );

  // MPI ring
  const ringProgress = interpolate(mpiSpring, [0, 1], [0, data.mpiScore / 100]);
  const circumference = 2 * Math.PI * 60;

  // Grade cards
  const gradeCards = gradeEntries.map(([key, grade], i) => {
    const cardSpring = spring({
      frame: frame - (45 + i * 12),
      fps,
      config: { damping: 15, stiffness: 180 },
    });
    const cardScale = interpolate(cardSpring, [0, 1], [0.5, 1]);
    const cardOpacity = interpolate(cardSpring, [0, 1], [0, 1]);
    const cardY = interpolate(cardSpring, [0, 1], [30, 0]);

    const gradeColor =
      grade.startsWith("A") ? "#22c55e" : grade.startsWith("B") ? "#f59e0b" : "#ef4444";

    return (
      <div
        key={key}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: 14,
          opacity: cardOpacity,
          transform: `translateY(${cardY}px) scale(${cardScale})`,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.7)",
            fontFamily: "sans-serif",
            textTransform: "capitalize",
            fontWeight: 500,
          }}
        >
          {key}
        </span>
        <span
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: gradeColor,
            fontFamily: "sans-serif",
          }}
        >
          {grade}
        </span>
      </div>
    );
  });

  // Streak badge
  const streakSpring = spring({
    frame: frame - (45 + gradeEntries.length * 12 + 15),
    fps,
    config: { damping: 10, stiffness: 200 },
  });
  const streakScale = interpolate(streakSpring, [0, 1], [0, 1]);
  const streakOpacity = interpolate(streakSpring, [0, 1], [0, 1]);

  // Ambient glow breathing
  const glowOpacity = interpolate(Math.sin(frame * 0.04), [-1, 1], [0.05, 0.12]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, rgba(59,130,246,${glowOpacity}) 0%, #0a0a0f 70%)`,
      }}
    >
      <PhoneMockup delay={5}>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* App header */}
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              textAlign: "center",
              paddingTop: 8,
            }}
          >
            MPI Dashboard
          </div>

          {/* MPI Score Ring */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative", height: 160 }}>
            <svg width={140} height={140} style={{ position: "absolute" }}>
              {/* Track */}
              <circle
                cx={70} cy={70} r={60}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={8}
              />
              {/* Progress */}
              <circle
                cx={70} cy={70} r={60}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - ringProgress)}
                transform="rotate(-90 70 70)"
              />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", fontFamily: "sans-serif" }}>
                {mpiValue}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.4)", fontFamily: "sans-serif", letterSpacing: "0.08em" }}>
                MPI SCORE
              </div>
            </div>
          </div>

          {/* Grade Cards */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {gradeCards}
          </div>

          {/* Streak Badge */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 8,
              opacity: streakOpacity,
              transform: `scale(${streakScale})`,
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                borderRadius: 20,
                padding: "10px 24px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 22 }}>🔥</span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#fff",
                  fontFamily: "sans-serif",
                }}
              >
                {data.streak} Day Streak
              </span>
            </div>
          </div>
        </div>
      </PhoneMockup>
    </AbsoluteFill>
  );
};
