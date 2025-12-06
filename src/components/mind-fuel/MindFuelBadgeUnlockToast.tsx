import { toast } from 'sonner';

interface BadgeUnlockConfig {
  badgeKey: string;
}

const BADGE_INFO: Record<string, { name: string; emoji: string }> = {
  mind_starter: { name: 'Mind Starter', emoji: '🧠' },
  week_focus: { name: 'Week of Focus', emoji: '⚡' },
  consistency_champ: { name: 'Consistency Champ', emoji: '🏆' },
  mental_warrior: { name: 'Mental Warrior', emoji: '⚔️' },
  limitless_leader: { name: 'Limitless Leader', emoji: '👑' },
  unbreakable_mind: { name: 'Unbreakable Mind', emoji: '💎' },
  focus_master: { name: 'Focus Master', emoji: '🎯' },
  peace_practitioner: { name: 'Peace Practitioner', emoji: '☮️' },
  leadership_elite: { name: 'Leadership Elite', emoji: '🦁' },
  discipline_engine: { name: 'Discipline Engine', emoji: '⚙️' },
  mind_shift: { name: 'The Mind Shift', emoji: '🔄' },
  breakthrough_day: { name: 'Breakthrough Day', emoji: '💥' },
  unlocked_potential: { name: 'Unlocked Potential', emoji: '🔓' },
  the_reset: { name: 'The Reset Badge', emoji: '🔁' },
};

function triggerConfetti() {
  // Create confetti container
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    overflow: hidden;
  `;
  document.body.appendChild(container);

  // Create confetti particles
  const colors = ['#8b5cf6', '#d946ef', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'];
  const particleCount = 50;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 10 + 5;
    const left = Math.random() * 100;
    const animationDuration = Math.random() * 2 + 2;
    const delay = Math.random() * 0.5;

    particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      left: ${left}%;
      top: -20px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
      animation: confetti-fall ${animationDuration}s ease-out ${delay}s forwards;
    `;

    container.appendChild(particle);
  }

  // Add animation keyframes
  if (!document.getElementById('confetti-styles')) {
    const style = document.createElement('style');
    style.id = 'confetti-styles';
    style.textContent = `
      @keyframes confetti-fall {
        0% {
          transform: translateY(0) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(720deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Clean up after animation
  setTimeout(() => {
    container.remove();
  }, 5000);
}

export function showBadgeUnlockToast({ badgeKey }: BadgeUnlockConfig) {
  const badgeInfo = BADGE_INFO[badgeKey];
  if (!badgeInfo) return;

  // Trigger confetti
  triggerConfetti();

  // Haptic feedback
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }

  // Show toast
  toast.custom(
    (t) => (
      <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-5">
        <div className="text-4xl">{badgeInfo.emoji}</div>
        <div>
          <p className="text-xs font-medium text-white/80 uppercase tracking-wide">
            Badge Unlocked!
          </p>
          <p className="text-lg font-bold">{badgeInfo.name}</p>
        </div>
      </div>
    ),
    {
      duration: 4000,
      position: 'top-center',
    }
  );
}

export function useMindFuelBadgeUnlock() {
  const unlockBadge = (badgeKey: string) => {
    showBadgeUnlockToast({ badgeKey });
  };

  return { unlockBadge };
}
