import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

type HookSimData = {
  headline: string;
  subtext: string;
  stats: { label: string; value: string }[];
};

export const HookProblemScene: React.FC<{ simData: Record<string, any> }> = ({
  simData,
}) => {
  const data = simData as HookSimData;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background pulse
  const bgPulse = interpolate(
    Math.sin(frame * 0.03),
    [-1, 1],
    [0.08, 0.15]
  );

  // Headline slam-in
  const headlineSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 200 },
  });
  const headlineScale = interpolate(headlineSpring, [0, 1], [2.5, 1]);
  const headlineOpacity = interpolate(headlineSpring, [0, 1], [0, 1]);
  const headlineBlur = interpolate(headlineSpring, [0, 0.5], [12, 0], {
    extrapolateRight: "clamp",
  });

  // Stats stagger
  const statsElements = (data.stats || []).map((stat, i) => {
    const statDelay = 35 + i * 18;
    const statSpring = spring({
      frame: frame - statDelay,
      fps,
      config: { damping: 16, stiffness: 160 },
    });
    const statX = interpolate(statSpring, [0, 1], [-60, 0]);
    const statOpacity = interpolate(statSpring, [0, 1], [0, 1]);

    return (
      <div
        key={i}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          opacity: statOpacity,
          transform: `translateX(${statX}px)`,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: "#ff4444",
            fontFamily: "sans-serif",
            minWidth: 140,
            textAlign: "right",
          }}
        >
          {stat.value}
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 500,
            color: "rgba(255,255,255,0.7)",
            fontFamily: "sans-serif",
          }}
        >
          {stat.label}
        </div>
      </div>
    );
  });

  // Subtext fade
  const subtextDelay = 35 + (data.stats?.length || 0) * 18 + 20;
  const subtextOpacity = interpolate(
    frame,
    [subtextDelay, subtextDelay + 25],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const subtextY = interpolate(
    frame,
    [subtextDelay, subtextDelay + 25],
    [20, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 30%, rgba(255,40,40,${bgPulse}) 0%, #0a0a0f 70%)`,
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      {/* Headline */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: "#ffffff",
          fontFamily: "sans-serif",
          textAlign: "center",
          lineHeight: 1.1,
          opacity: headlineOpacity,
          transform: `scale(${headlineScale})`,
          filter: `blur(${headlineBlur}px)`,
          marginBottom: 80,
          maxWidth: 900,
          letterSpacing: "-0.03em",
        }}
      >
        {data.headline}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {statsElements}
      </div>

      {/* Subtext */}
      <div
        style={{
          fontSize: 30,
          fontWeight: 400,
          color: "rgba(255,255,255,0.5)",
          fontFamily: "sans-serif",
          textAlign: "center",
          marginTop: 60,
          opacity: subtextOpacity,
          transform: `translateY(${subtextY}px)`,
          maxWidth: 700,
          lineHeight: 1.5,
        }}
      >
        {data.subtext}
      </div>
    </AbsoluteFill>
  );
};
