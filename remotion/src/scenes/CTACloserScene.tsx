import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const CTACloserScene: React.FC<{
  simData: { headline: string; subtext: string; url: string };
}> = ({ simData }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { headline = "Train Smarter.", subtext = "The future of athlete development.", url = "hammersmodality.com" } = simData;

  // Slam-in effect for headline
  const slamEntry = spring({ frame: frame - 5, fps, config: { damping: 10, stiffness: 300 } });
  const slamScale = interpolate(slamEntry, [0, 1], [3, 1]);
  const slamOp = interpolate(slamEntry, [0, 1], [0, 1]);

  // Subtext fade
  const subEntry = spring({ frame: frame - 25, fps, config: { damping: 20, stiffness: 120 } });
  const subOp = interpolate(subEntry, [0, 1], [0, 1]);
  const subY = interpolate(subEntry, [0, 1], [30, 0]);

  // URL/CTA
  const ctaEntry = spring({ frame: frame - 45, fps, config: { damping: 18, stiffness: 140 } });
  const ctaOp = interpolate(ctaEntry, [0, 1], [0, 1]);
  const ctaY = interpolate(ctaEntry, [0, 1], [20, 0]);

  // Pulsing glow
  const pulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse at center, #1a1040 0%, #0a0a1a 70%)",
        fontFamily: "sans-serif",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Accent glow */}
      <div style={{
        position: "absolute",
        width: 500, height: 500,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(79,140,255,0.15) 0%, transparent 70%)",
        opacity: pulse,
        filter: "blur(40px)",
      }} />

      {/* Headline slam */}
      <div style={{
        opacity: slamOp,
        transform: `scale(${slamScale})`,
        textAlign: "center",
        zIndex: 1,
      }}>
        <div style={{
          fontSize: 72,
          fontWeight: 900,
          color: "#ffffff",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          textShadow: "0 0 60px rgba(79,140,255,0.3)",
        }}>
          {headline}
        </div>
      </div>

      {/* Subtext */}
      <div style={{
        position: "absolute",
        top: "58%",
        opacity: subOp,
        transform: `translateY(${subY}px)`,
        textAlign: "center",
        zIndex: 1,
      }}>
        <div style={{
          fontSize: 26,
          color: "rgba(255,255,255,0.6)",
          fontWeight: 400,
          maxWidth: 600,
        }}>
          {subtext}
        </div>
      </div>

      {/* CTA / URL */}
      <div style={{
        position: "absolute",
        bottom: 140,
        opacity: ctaOp,
        transform: `translateY(${ctaY}px)`,
        zIndex: 1,
      }}>
        <div style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#4f8cff",
          letterSpacing: "0.05em",
          padding: "14px 40px",
          borderRadius: 12,
          border: "2px solid rgba(79,140,255,0.4)",
          background: "rgba(79,140,255,0.08)",
          boxShadow: `0 0 ${20 + pulse * 15}px rgba(79,140,255,${0.1 + pulse * 0.15})`,
        }}>
          {url}
        </div>
      </div>
    </AbsoluteFill>
  );
};
