import { useEffect, useState } from "react";

interface ConfettiParticle {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  rotation: number;
}

interface ConfettiEffectProps {
  particleCount?: number;
  duration?: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "#FFD700",
  "#22C55E",
  "#A855F7",
  "#F59E0B",
  "#EC4899",
];

export function ConfettiEffect({ particleCount: propParticleCount, duration: propDuration }: ConfettiEffectProps = {}) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const count = propParticleCount ?? (prefersReducedMotion ? 20 : 60);
    const animDuration = propDuration ?? 4000;

    const newParticles: ConfettiParticle[] = Array.from(
      { length: count },
      (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.5,
        duration: prefersReducedMotion ? 4 : 2 + Math.random() * 2,
        rotation: Math.random() * 360,
      })
    );

    setParticles(newParticles);

    // Cleanup after animation
    const timeout = setTimeout(() => {
      setIsVisible(false);
    }, animDuration);

    return () => clearTimeout(timeout);
  }, [propParticleCount, propDuration]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-3 h-3 animate-confetti-fall"
          style={{
            left: `${particle.x}%`,
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            transform: `rotate(${particle.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? "50%" : "0",
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
}
