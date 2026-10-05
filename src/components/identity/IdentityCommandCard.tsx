import { useEffect, useMemo, useState } from 'react';

import {
  ChevronDown, Flame, ShieldCheck, AlertTriangle, CheckCircle2, X,
  Moon, SkipForward, HelpCircle, ArrowUpRight, TrendingDown, TrendingUp,
  Lightbulb, Zap, Info,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIdentityState } from '@/hooks/useIdentityState';
import { useDayState } from '@/hooks/useDayState';
import { AdaptivePhaseStrip } from '@/components/hammer/AdaptivePhaseStrip';
import { ScheduleDropdownWrapper } from '@/components/hammer/ScheduleDropdownWrapper';
import { useBehavioralEvents, type BehavioralEvent } from '@/hooks/useBehavioralEvents';
import { useHIESnapshot } from '@/hooks/useHIESnapshot';
import { Link } from 'react-router-dom';

import { useQuickActionExecutor, type QuickActionType } from '@/hooks/useQuickActionExecutor';
import { useEngineRecomputeTrigger } from '@/hooks/useEngineRecomputeTrigger';
import { pickRotatingAlert } from '@/lib/identity/rotatingAlert';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { safeSet } from '@/lib/safeStorage';
import { getTodayDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const COLLAPSE_KEY = 'hm:identityCard:collapsedDate';

// ─────────────────────────────────────────────────────────────────────────────
// Pressure-event presentation (mirrors BehavioralPressureToast)
// ─────────────────────────────────────────────────────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  complete_nn: 'Complete NN',
  save_streak: 'Save streak',
  log_session: 'Log now',
  rest_today: 'Rest today',
  reset_2min: '2-min reset',
};

function formatEvent(ev: BehavioralEvent): { text: string; tone: string; Icon: any } {
  if (ev.command_text) {
    return {
      text: ev.command_text,
      tone: toneFor(ev.event_type),
      Icon: iconFor(ev.event_type),
    };
  }
  switch (ev.event_type) {
    case 'nn_miss': {
      const titles = Array.isArray((ev.metadata as any)?.missed_today_titles)
        ? ((ev.metadata as any).missed_today_titles as string[])
        : [];
      const n = Number((ev.metadata as any)?.missed_today_count ?? ev.magnitude ?? 0);
      let text: string;
      if (n === 1 && titles[0]) text = `You haven't done ${titles[0]} yet today. Lock it in.`;
      else if (n >= 2 && titles.length >= 2) text = `${n} non-negotiables still open today: ${titles.slice(0, 2).join(', ')}. Lock them in.`;
      else if (n >= 2) text = `${n} non-negotiables still open today. Lock them in.`;
      else text = "Today's standard isn't met yet. Open Non-Negotiables to fix it.";
      return { text, tone: toneFor('nn_miss'), Icon: AlertTriangle };
    }
    case 'streak_risk':
      return { text: 'You are about to break your streak. Act.', tone: toneFor('streak_risk'), Icon: Flame };
    case 'rest_overuse':
      return { text: 'Rest limit exceeded — standard slipping.', tone: toneFor('rest_overuse'), Icon: Moon };
    case 'consistency_drop': {
      const d = Math.round(Number(ev.magnitude ?? 0));
      return { text: `Consistency dropped ${d}%. Reset the standard.`, tone: toneFor('consistency_drop'), Icon: TrendingDown };
    }
    case 'identity_tier_change': {
      const to = String((ev.metadata as any)?.to ?? '').toUpperCase().replace('_', ' ');
      const from = String((ev.metadata as any)?.from ?? '');
      const ranks = ['slipping', 'building', 'consistent', 'locked_in', 'elite'];
      const up = ranks.indexOf(String((ev.metadata as any)?.to)) > ranks.indexOf(from);
      return {
        text: up ? `You moved to ${to}.` : `Slipped to ${to}. Reclaim it.`,
        tone: up ? toneFor('consistency_recover') : toneFor('nn_miss'),
        Icon: up ? ArrowUpRight : TrendingDown,
      };
    }
    case 'coaching_insight':
      return { text: String((ev.metadata as any)?.insight ?? 'Coaching available.'), tone: toneFor('coaching_insight'), Icon: Lightbulb };
    case 'consistency_recover': {
      const d = Math.round(Number(ev.magnitude ?? 0));
      return { text: `Back on track. +${d}%. LOCKED IN.`, tone: toneFor('consistency_recover'), Icon: TrendingUp };
    }
    default:
      return { text: 'Update available.', tone: 'sky', Icon: AlertTriangle };
  }
}

function toneFor(type: string) {
  // Returns a color key. Surface stays neutral; only a thin left bar +
  // the icon carry the semantic color.
  const map: Record<string, 'rose' | 'amber' | 'orange' | 'emerald' | 'sky' | 'fuchsia'> = {
    nn_miss: 'rose',
    streak_risk: 'amber',
    rest_overuse: 'orange',
    consistency_drop: 'amber',
    consistency_recover: 'emerald',
    coaching_insight: 'sky',
    identity_tier_change: 'fuchsia',
  };
  return map[type] ?? 'sky';
}
const BAR_BY_TONE: Record<string, string> = {
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  fuchsia: 'bg-fuchsia-500',
};
const ICON_BY_TONE: Record<string, string> = {
  rose: 'text-rose-500',
  amber: 'text-amber-500',
  orange: 'text-orange-500',
  emerald: 'text-emerald-500',
  sky: 'text-sky-500',
  fuchsia: 'text-fuchsia-500',
};
function iconFor(type: string): any {
  const map: Record<string, any> = {
    nn_miss: AlertTriangle, streak_risk: Flame, rest_overuse: Moon,
    consistency_drop: TrendingDown, consistency_recover: TrendingUp,
    coaching_insight: Lightbulb, identity_tier_change: ArrowUpRight,
  };
  return map[type] ?? AlertTriangle;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
interface Props { className?: string }

export function IdentityCommandCard({ className }: Props) {
  const { user } = useAuth();
  const { snapshot, label, tone, accent, scoreText, loading } = useIdentityState();
  const { dayType } = useDayState();
  const { active: activeEvent, all: allEvents, acknowledge } = useBehavioralEvents();
  const { execute, running } = useQuickActionExecutor();
  const rotatingAlert = useMemo(() => pickRotatingAlert(allEvents), [allEvents]);
  useEngineRecomputeTrigger();

  // ─── Standard-confirmed state ───────────────────────────────────────────
  const today = useMemo(() => getTodayDate(), []);
  // ─── Open / closed ──────────────────────────────────────────────────────
  // Defaults to CLOSED. The athlete opens it when they want it; alerts are
  // still surfaced on the collapsed header (unread dot), never auto-expanded.
  const hasAlerts = (allEvents?.length ?? 0) > 0;
  void hasAlerts;

  const [open, setOpen] = useState<boolean>(false);


  const stampCollapsed = () => safeSet(COLLAPSE_KEY, today);
  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (!next) stampCollapsed();
      return next;
    });
  };

  // ─── Pressure event action ───────────────────────────────────────────────
  const handleEventAction = async (ev: BehavioralEvent) => {
    if (!ev.action_type) return;
    const res = await execute(ev.action_type as QuickActionType, ev.action_payload ?? {});
    if (res.ok) {
      toast.success(res.message);
      await acknowledge(ev.id);
    }
  };

  // ─── Quick log ───────────────────────────────────────────────────────────
  

  if (loading) {
    return (
      <div className={cn('rounded-2xl border bg-card/50 p-4 animate-pulse h-20', className)} />
    );
  }

  const score = snapshot?.consistency_score ?? 0;
  const perfStreak = snapshot?.performance_streak ?? 0;
  const discStreak = snapshot?.discipline_streak ?? 0;
  const nnMiss = snapshot?.nn_miss_count_7d ?? 0;

  const hasUnreadAlert = !!activeEvent;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm',
          className,
        )}
      >
        {/* Thin tier accent — only colored signal on the surface */}
        <div className={cn('pointer-events-none absolute inset-y-0 left-0 w-[3px]', accent)} aria-hidden />

        {/* ─── Always-visible header (acts as the toggle) ──────────────── */}
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={open}
          aria-label={open ? 'Collapse identity card' : 'Open identity card'}
          className="relative w-full text-left px-4 py-3.5 sm:px-5 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Identity
                </span>
                {dayType !== 'standard' && (
                  <span
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border',
                      "bg-muted text-muted-foreground border-border",
                    )}
                  >
                    {dayType.toUpperCase()} day
                  </span>
                )}
              </div>

              <div className="mt-1.5 flex items-end justify-between gap-3 sm:block">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={cn('text-2xl font-bold tracking-tight leading-tight break-words', tone)}>
                      {label}
                    </span>
                  </div>
                </div>

                {/* Mobile-only score */}
                <div className="flex flex-col items-end shrink-0 sm:hidden">
                  <div className={cn('text-3xl font-bold tabular-nums leading-none', scoreText)}>
                    {score}
                  </div>
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Consistency
                  </div>
                </div>
              </div>
            </div>

            {/* Right column on sm+ */}
            <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
              <div className={cn('text-3xl font-bold tabular-nums leading-none', scoreText)}>
                {score}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Consistency
              </div>
            </div>

            {/* Chevron */}
            <div className="relative shrink-0 self-start pt-0.5">
              {hasUnreadAlert && !open && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-card animate-pulse" />
              )}
              <ChevronDown
                className={cn(
                  'h-5 w-5 text-muted-foreground transition-transform',
                  open && 'rotate-180',
                )}
              />
            </div>
          </div>

          {/* Row 3: streak chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 h-6 rounded-full border border-border bg-muted/50 px-2.5 font-medium text-foreground">
              <Flame className="h-3 w-3 text-orange-500" />
              <span className="tabular-nums">{perfStreak}</span>
              <span className="text-muted-foreground">d perf</span>
            </span>
            <span className="inline-flex items-center gap-1.5 h-6 rounded-full border border-border bg-muted/50 px-2.5 font-medium text-foreground">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              <span className="tabular-nums">{discStreak}</span>
              <span className="text-muted-foreground">d active</span>
            </span>
            {nnMiss > 0 && (
              <span className="inline-flex items-center gap-1.5 h-6 rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 font-medium text-rose-700 dark:text-rose-300">
                <span className="tabular-nums">{nnMiss}</span>
                <span>miss/7d</span>
              </span>
            )}
            {typeof hieSnapshot?.readiness_score === 'number' && (
              <Link
                to="/progress#body"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 h-6 rounded-full border border-border bg-muted/50 px-2.5 font-medium text-foreground hover:bg-muted transition-colors"
                aria-label="Open full body report"
              >
                <span className="text-muted-foreground">Body</span>
                <span className="tabular-nums">{Math.round(hieSnapshot.readiness_score)}</span>
                <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
              </Link>
            )}
          </div>
        </button>



        {/* ─── Expanded panel ─────────────────────────────────────────── */}
        <Collapsible open={open}>
          <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            <div className="px-3 sm:px-4 pb-4 pt-1 space-y-4 border-t border-border/40">

              <div className="space-y-2 pt-2">
                <AdaptivePhaseStrip />
                <ScheduleDropdownWrapper />
              </div>

              {/* ── 3. One Rotating Alert (highest priority only) ────── */}
              {rotatingAlert && (() => {
                const sourceEvent = allEvents?.find((e) => e.id === rotatingAlert.id);
                const Icon = iconFor(sourceEvent?.event_type ?? '');
                const barColor = BAR_BY_TONE[rotatingAlert.tone] ?? 'bg-sky-500';
                const iconColor = ICON_BY_TONE[rotatingAlert.tone] ?? 'text-sky-500';
                return (
                  <section>
                    <SectionHeader
                      title="One Thing"
                      helpText="The single most important thing for you right now. Acting clears it."
                    />
                    <div
                      className="relative overflow-hidden rounded-lg border border-border bg-background/40 px-3 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center"
                      role="status"
                    >
                      <div className={cn('absolute inset-y-0 left-0 w-[3px]', barColor)} aria-hidden />
                      <div className="flex items-start gap-2 flex-1 min-w-0 pl-1">
                        <Icon className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', iconColor)} />
                        <span className="flex-1 min-w-0 text-xs font-semibold text-foreground leading-snug break-words">
                          {rotatingAlert.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {rotatingAlert.actionType && sourceEvent && (
                          <Button
                            size="sm"
                            onClick={() => handleEventAction(sourceEvent)}
                            disabled={running}
                            className="h-7 px-2.5 gap-1 font-bold text-[11px]"
                          >
                            <Zap className="h-3 w-3" />
                            {rotatingAlert.actionLabel}
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => acknowledge(rotatingAlert.id)}
                          aria-label="Dismiss"
                          className="h-7 w-7 rounded grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </section>
                );
              })()}

            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </TooltipProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ title, helpText }: { title: string; helpText: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h4>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`What is ${title}?`}
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground/60 hover:text-foreground transition-colors p-1 -m-1"
          >
            <Info className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          className="max-w-[260px] text-xs leading-relaxed p-3"
          onClick={(e) => e.stopPropagation()}
        >
          {helpText}
        </PopoverContent>
      </Popover>
    </div>
  );
}

