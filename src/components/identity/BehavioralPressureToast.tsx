import { useBehavioralEvents, type BehavioralEvent } from '@/hooks/useBehavioralEvents';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle, TrendingDown, TrendingUp, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatMessage(ev: BehavioralEvent): { text: string; tone: string; Icon: any } {
  switch (ev.event_type) {
    case 'nn_miss': {
      const n = ev.magnitude ?? 1;
      return {
        text: n > 1 ? `Standard broken — ${n} non-negotiables missed.` : 'Standard broken — non-negotiable missed.',
        tone: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
        Icon: AlertTriangle,
      };
    }
    case 'consistency_drop': {
      const d = Math.round(Number(ev.magnitude ?? 0));
      return {
        text: `Consistency dropped ${d}%.`,
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
        text: up ? `You moved to ${to}.` : `Slipped to ${to}.`,
        tone: up
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
          : 'border-rose-500/40 bg-rose-500/10 text-rose-200',
        Icon: up ? ArrowUpRight : TrendingDown,
      };
    }
    case 'consistency_recover': {
      const d = Math.round(Number(ev.magnitude ?? 0));
      return {
        text: `Back on track. +${d}%.`,
        tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
        Icon: TrendingUp,
      };
    }
    default:
      return { text: 'Update available.', tone: 'border-border bg-card', Icon: AlertTriangle };
  }
}

export function BehavioralPressureToast() {
  const { active, acknowledge } = useBehavioralEvents();
  if (!active) return null;

  const { text, tone, Icon } = formatMessage(active);

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold',
        tone
      )}
      role="status"
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1 min-w-0">{text}</span>
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
