import { useEffect, useMemo, useState } from "react";
import { TrendingDown, X, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVideoConfidenceMap } from "@/hooks/useVideoConfidenceMap";

const DISMISS_KEY = 'hammer.owner.coachingNudge.dismissed.session';

interface Nudge {
  id: string;
  message: string;
  cta?: { label: string; onClick: () => void };
}

interface Props {
  /**
   * Authoritative throttled count from the parent — must match the same
   * `distribution_tier === 'throttled'` signal the per-card badge & filter use,
   * so the nudge claim and the "Fix now" filtered list always agree.
   */
  throttledCount?: number;
  /**
   * Authoritative blocked (Empty) count — videos hidden from athletes entirely.
   * Higher priority than throttled because they reach 0 athletes.
   */
  blockedCount?: number;
  onFixThrottled?: () => void;
  onFixBlocked?: () => void;
}

/**
 * Phase 6 — Silent Coaching.
 * Surfaces ONE pattern at a time. Dismissible per session. Pure derivation.
 */
export function OwnerCoachingNudge({ throttledCount = 0, blockedCount = 0, onFixThrottled, onFixBlocked }: Props) {
  const { data: confidenceMap } = useVideoConfidenceMap();
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1'); } catch { /* ignore */ }
  }, []);

  const nudge = useMemo<Nudge | null>(() => {
    // Highest priority: blocked videos reach zero athletes.
    const fixBlocked = onFixBlocked ?? onFixThrottled;
    if (blockedCount >= 1 && fixBlocked) {
      return {
        id: 'blocked-batch',
        message: `${blockedCount} ${blockedCount === 1 ? 'video is' : 'videos are'} hidden from athletes — fill in the missing fields to publish.`,
        cta: { label: 'Fix now', onClick: fixBlocked },
      };
    }

    // Next: throttled — visible but down-ranked.
    if (throttledCount >= 1 && onFixThrottled) {
      return {
        id: 'throttled-batch',
        message: `${throttledCount} ${throttledCount === 1 ? 'video is' : 'videos are'} throttled — fix now to restore reach.`,
        cta: { label: 'Fix now', onClick: onFixThrottled },
      };
    }

    if (!confidenceMap || confidenceMap.size === 0) return null;
    const all = Array.from(confidenceMap.values());
    const recent = all.slice(0, 10);
    const recentAvg = Math.round(recent.reduce((s, c) => s + c.score, 0) / Math.max(1, recent.length));
    const top5Avg = Math.round(
      [...all].sort((a, b) => b.score - a.score).slice(0, 5).reduce((s, c) => s + c.score, 0) / Math.max(1, Math.min(5, all.length))
    );

    if (recentAvg + 15 < top5Avg) {
      return {
        id: 'avg-vs-top',
        message: `Recent average: ${recentAvg} confidence — ${top5Avg - recentAvg} below your top 5.`,
      };
    }
    if (recentAvg < 70 && all.length >= 5) {
      return {
        id: 'low-recent',
        message: `Recent videos average ${recentAvg} confidence. You're leaving performance on the table.`,
      };
    }
    return null;
  }, [confidenceMap, throttledCount, onFixThrottled]);

  if (dismissed || !nudge) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  };

  return (
    <Card className="p-3 border-amber-500/30 bg-amber-500/5 flex items-center gap-3">
      <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
      <p className="text-xs flex-1">{nudge.message}</p>
      {nudge.cta && (
        <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={nudge.cta.onClick}>
          <Wrench className="h-3 w-3" />
          {nudge.cta.label}
        </Button>
      )}
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={dismiss} title="Dismiss">
        <X className="h-3 w-3" />
      </Button>
    </Card>
  );
}
