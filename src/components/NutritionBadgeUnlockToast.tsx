import { toast } from 'sonner';
import { triggerConfetti, triggerHapticFeedback } from '@/lib/confetti';

interface BadgeUnlockConfig {
  badgeKey: string;
}

const BADGE_INFO: Record<string, { name: string; emoji: string }> = {
  starter: { name: 'Getting Started', emoji: '🌱' },
  week_warrior: { name: 'Week Warrior', emoji: '⚡' },
  iron_will: { name: 'Iron Will', emoji: '💪' },
  iron_horse: { name: 'Iron Horse', emoji: '🏇' },
  elite: { name: 'Elite Performer', emoji: '🏆' },
  legendary: { name: 'Legendary', emoji: '👑' },
};

export function showBadgeUnlockToast({ badgeKey }: BadgeUnlockConfig) {
  const badgeInfo = BADGE_INFO[badgeKey];
  if (!badgeInfo) return;

  triggerConfetti();
  triggerHapticFeedback();

  toast.custom(
    () => (
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-5">
        <div className="text-4xl">{badgeInfo.emoji}</div>
        <div>
          <p className="text-xs font-medium text-white/80 uppercase tracking-wide">
            Nutrition Badge Unlocked!
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
