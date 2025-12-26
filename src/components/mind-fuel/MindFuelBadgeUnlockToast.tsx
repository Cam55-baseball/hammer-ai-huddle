import { toast } from 'sonner';
import { triggerConfetti, triggerHapticFeedback } from '@/lib/confetti';

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
  // Challenge badges
  challenge_starter: { name: 'Challenge Starter', emoji: '🚀' },
  challenge_warrior: { name: 'Challenge Warrior', emoji: '⚔️' },
  challenge_champion: { name: 'Challenge Champion', emoji: '🏅' },
  challenge_legend: { name: 'Challenge Legend', emoji: '🌟' },
  perfect_week: { name: 'Perfect Week', emoji: '✨' },
  comeback_kid: { name: 'Comeback Kid', emoji: '💪' },
};

export function showBadgeUnlockToast({ badgeKey }: BadgeUnlockConfig) {
  const badgeInfo = BADGE_INFO[badgeKey];
  if (!badgeInfo) return;

  // Trigger confetti and haptic feedback
  triggerConfetti();
  triggerHapticFeedback();

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
