import { useTranslation } from "react-i18next";
import { Award, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface BadgeUnlockConfig {
  badgeKey: string;
  badgeName: string;
}

export function showBadgeUnlockToast({ badgeKey, badgeName }: BadgeUnlockConfig) {
  toast.custom(
    (id) => (
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border border-primary/30 rounded-lg p-4 shadow-xl animate-in slide-in-from-top-5 duration-500">
        <div className="flex items-center gap-3">
          {/* Animated Badge Icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping" />
            <div className="relative p-3 bg-primary/20 rounded-full">
              <Award className="h-6 w-6 text-primary animate-bounce" />
            </div>
          </div>
          
          {/* Text Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
              <span className="font-bold text-primary">Badge Earned!</span>
              <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
            </div>
            <p className="text-sm font-medium">{badgeName}</p>
            <p className="text-xs text-muted-foreground mt-1">
              This badge is for educational achievement only.
            </p>
          </div>
        </div>
      </div>
    ),
    {
      duration: 5000,
      position: "top-center",
    }
  );
}

// Hook to trigger badge unlock with sound (optional)
export function useBadgeUnlock() {
  const { t } = useTranslation();

  const unlockBadge = (badgeKey: string) => {
    const badgeName = t(`bounceBackBay.badges.items.${badgeKey}.name`);
    showBadgeUnlockToast({ badgeKey, badgeName });
    
    // Optional: Play unlock sound
    try {
      const audio = new Audio('/sounds/badge-unlock.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignore errors if sound file doesn't exist
    } catch {
      // Silently fail if audio isn't available
    }
  };

  return { unlockBadge };
}
