import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const AnimatedMetric: React.FC<{
  value: string | number;
  label?: string;
  delay?: number;
  fontSize?: number;
  color?: string;
}> = ({ value, label, delay = 0, fontSize = 64, color = "#ffffff" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 180 },
  });

  const scale = interpolate(entrance, [0, 1], [0.3, 1]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const y = interpolate(entrance, [0, 1], [40, 0]);

  const isNumber = typeof value === "number";
  const displayValue = isNumber
    ? Math.round(interpolate(entrance, [0, 1], [0, value as number]))
    : value;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
      }}
    >
      <div
        style={{
          fontSize,
          fontWeight: 800,
          color,
          fontFamily: "sans-serif",
          letterSpacing: "-0.02em",
        }}
      >
        {displayValue}
      </div>
      {label && (
        <div
          style={{
            fontSize: fontSize * 0.28,
            fontWeight: 500,
            color: "rgba(255,255,255,0.6)",
            fontFamily: "sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};
