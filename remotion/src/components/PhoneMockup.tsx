import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";

export const PhoneMockup: React.FC<{
  children: React.ReactNode;
  delay?: number;
}> = ({ children, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 22, stiffness: 120, mass: 1.2 },
  });

  const scale = interpolate(entrance, [0, 1], [0.85, 1]);
  const y = interpolate(entrance, [0, 1], [80, 0]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  const phoneWidth = 380;
  const phoneHeight = 780;
  const borderRadius = 48;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
      }}
    >
      <div
        style={{
          width: phoneWidth,
          height: phoneHeight,
          borderRadius,
          border: "4px solid rgba(255,255,255,0.15)",
          background: "linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        {/* Notch */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 160,
            height: 32,
            borderRadius: "0 0 20px 20px",
            background: "#000",
            zIndex: 10,
          }}
        />
        {/* Screen content */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 12,
            right: 12,
            bottom: 12,
            overflow: "hidden",
          }}
        >
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};
