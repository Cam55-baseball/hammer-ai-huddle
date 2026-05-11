import { useBehavioralEvents, type BehavioralEvent } from '@/hooks/useBehavioralEvents';
import { useQuickActionExecutor, type QuickActionType } from '@/hooks/useQuickActionExecutor';
import { Button } from '@/components/ui/button';
import {
  X, AlertTriangle, TrendingDown, TrendingUp, ArrowUpRight,
  Moon, Flame, Lightbulb, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function formatMessage(ev: BehavioralEvent): { text: string; tone: string; Icon: any } {
  // Engine-provided command text takes precedence (Phase 10 identity-pressure copy)
  if (ev.command_text) {
    const tones: Record<string, string> = {
      nn_miss: 'border-rose-500/60 bg-rose-500/15 text-rose-900 dark:text-rose-50',
      streak_risk: 'border-amber-500/60 bg-amber-500/15 text-amber-900 dark:text-amber-50',
      rest_overuse: 'border-orange-500/60 bg-orange-500/15 text-orange-900 dark:text-orange-50',
      consistency_drop: 'border-amber-500/60 bg-amber-500/15 text-amber-900 dark:text-amber-50',
      consistency_recover: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-900 dark:text-emerald-50',
      coaching_insight: 'border-sky-500/60 bg-sky-500/15 text-sky-900 dark:text-sky-50',
      identity_tier_change: 'border-fuchsia-500/60 bg-fuchsia-500/15 text-fuchsia-900 dark:text-fuchsia-50',
    };
    const icons: Record<string, any> = {
      nn_miss: AlertTriangle,
      streak_risk: Flame,
      rest_overuse: Moon,
      consistency_drop: TrendingDown,
      consistency_recover: TrendingUp,
      coaching_insight: Lightbulb,
      identity_tier_change: ArrowUpRight,
    };
    return {
      text: ev.command_text,
      tone: tones[ev.event_type] ?? 'border-border bg-card',
      Icon: icons[ev.event_type] ?? AlertTriangle,
    };
  }

  switch (ev.event_type) {
    case 'nn_miss': {
      const titles = Array.isArray((ev.metadata as any)?.missed_today_titles)
        ? ((ev.metadata as any).missed_today_titles as string[])
        : [];
      const n = Number((ev.metadata as any)?.missed_today_count ?? ev.magnitude ?? 0);
      let text: string;
      if (n <= 0) {
        text = "Today's standard isn't met yet. Open Non-Negotiables to fix it.";
      } else if (n === 1 && titles[0]) {
        text = `You haven't done ${titles[0]} yet today. Lock it in.`;
      } else if (n >= 2 && titles.length >= 2) {
        text = `${n} non-negotiables still open today: ${titles.slice(0, 2).join(', ')}. Lock them in.`;
      } else if (n >= 2) {
        text = `${n} non-negotiables still open today. Lock them in.`;
      } else {
        text = "Today's standard isn't met yet. Open Non-Negotiables to fix it.";
      }
      return {
        text,
        tone: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
        Icon: AlertTriangle,
      };
    }
    case 'streak_risk':
      return {
        text: 'You are about to break your streak. Act.',
        tone: 'border-amber-500/50 bg-amber-500/10 text-amber-200',
        Icon: Flame,
      };
    case 'rest_overuse':
      return {
        text: 'Rest limit exceeded — standard slipping.',
        tone: 'border-orange-500/40 bg-orange-500/10 text-orange-200',
        Icon: Moon,
      };
    case 'consistency_drop': {
      const d = Math.round(Number(ev.magnitude ?? 0));
      return {
        text: `Consistency dropped ${d}%. Reset the standard.`,
        tone: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
        Icon: TrendingDown,
      };
    }
    case 'identity_tier_change': {
      const to = String(ev.metadata?.to ?? '').toUpperCase().replace('_', ' ');
      const from = String(ev.metadata?.from ?? '');
      const ranks = ['slipping', 'building', 'consistent', 'locked_in', 'elite'];
      const up = ranks.indexOf(String(ev.metadata?.to)) > ranks.indexOf(from);
      return {
        text: up ? `You moved to ${to}.` : `Slipped to ${to}. Reclaim it.`,
        tone: up
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
          : 'border-rose-500/40 bg-rose-500/10 text-rose-200',
        Icon: up ? ArrowUpRight : TrendingDown,
      };
    }
    case 'coaching_insight':
      return {
        text: String(ev.metadata?.insight ?? 'Coaching available.'),
        tone: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
        Icon: Lightbulb,
      };
    case 'consistency_recover': {
      const d = Math.round(Number(ev.magnitude ?? 0));
      return {
        text: `Back on track. +${d}%. LOCKED IN.`,
        tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
        Icon: TrendingUp,
      };
    }
    default:
      return { text: 'Update available.', tone: 'border-border bg-card', Icon: AlertTriangle };
  }
}

const ACTION_LABELS: Record<string, string> = {
  complete_nn: 'Complete NN',
  save_streak: 'Save streak',
  log_session: 'Log now',
  rest_today: 'Rest today',
  reset_2min: '2-min reset',
};

export function BehavioralPressureToast() {
  const { active, acknowledge } = useBehavioralEvents();
  const { execute, running } = useQuickActionExecutor();
  if (!active) return null;

  const { text, tone, Icon } = formatMessage(active);
  const actionType = (active.action_type ?? null) as QuickActionType | null;
  const actionLabel = actionType ? ACTION_LABELS[actionType] ?? 'Act now' : null;

  const handleAction = async () => {
    if (!actionType) return;
    const res = await execute(actionType, active.action_payload ?? {});
    if (res.ok) {
      toast.success(res.message);
      await acknowledge(active.id);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold',
        tone
      )}
      role="status"
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1 min-w-0">{text}</span>
      {actionType && (
        <Button
          size="sm"
          onClick={handleAction}
          disabled={running}
          className="h-7 gap-1 bg-white/15 hover:bg-white/25 text-current border-0 font-bold"
        >
          <Zap className="h-3 w-3" />
          {actionLabel}
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-current hover:bg-white/10"
        onClick={() => acknowledge(active.id)}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
