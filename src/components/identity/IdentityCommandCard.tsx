import { useEffect, useMemo, useState } from 'react';

import {
  ChevronDown, Flame, ShieldCheck, AlertTriangle, CheckCircle2, X,
  Moon, SkipForward, HelpCircle, ArrowUpRight, TrendingDown, TrendingUp,
  Lightbulb, Zap, Info,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIdentityState } from '@/hooks/useIdentityState';
import { useDayState, type DayType } from '@/hooks/useDayState';
import { useBehavioralEvents, type BehavioralEvent } from '@/hooks/useBehavioralEvents';

import { useQuickActionExecutor, type QuickActionType } from '@/hooks/useQuickActionExecutor';
import { useEngineRecomputeTrigger } from '@/hooks/useEngineRecomputeTrigger';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { safeGet, safeSet } from '@/lib/safeStorage';
import { getTodayDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const COLLAPSE_KEY = 'hm:identityCard:collapsedDate';

// ─────────────────────────────────────────────────────────────────────────────
// Day intent meta — kept in sync with the old DayControlCard / DayStateBanner
// ─────────────────────────────────────────────────────────────────────────────
const DAY_META: Record<DayType, { label: string; explanation: string; chipClass: string }> = {
  rest:     { label: 'REST',     explanation: 'Recovery supports performance. Streak protected. Non-Negotiables waived for today.', chipClass: 'bg-sky-500/15 text-sky-300 border-sky-500/40' },
  skip:     { label: 'SKIP',     explanation: 'Day ignored. No progress. No recovery credit.',                                       chipClass: 'bg-muted text-muted-foreground border-border' },
  push:     { label: 'PUSH',     explanation: 'Higher standard today. Extra output expected.',                                        chipClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  standard: { label: 'STANDARD', explanation: 'Operate at your current identity standard.',                                           chipClass: 'bg-background/60 text-muted-foreground border-border' },
};

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
      return { text: 'Update available.', tone: 'border-border bg-card text-foreground', Icon: AlertTriangle };
  }
}

function toneFor(type: string) {
  const map: Record<string, string> = {
    nn_miss: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
    streak_risk: 'border-amber-500/50 bg-amber-500/10 text-amber-200',
    rest_overuse: 'border-orange-500/40 bg-orange-500/10 text-orange-200',
    consistency_drop: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    consistency_recover: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    coaching_insight: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
    identity_tier_change: 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200',
  };
  return map[type] ?? 'border-border bg-card text-foreground';
}
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
  const { snapshot, tier, label, tone, ring, bg, loading } = useIdentityState();
  const { dayType, setDayType, restBudgetLeft, usedThisWeek, maxPerWeek, overBudget } = useDayState();
  const { active: activeEvent, all: allEvents, acknowledge } = useBehavioralEvents();
  const { execute, running } = useQuickActionExecutor();
  useEngineRecomputeTrigger();

  // ─── Standard-confirmed state ───────────────────────────────────────────
  const today = useMemo(() => getTodayDate(), []);
  const [standardConfirmed, setStandardConfirmed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from('daily_standard_checks')
        .select('id')
        .eq('user_id', user.id)
        .eq('check_date', today)
        .maybeSingle();
      if (!cancelled) setStandardConfirmed(!!data);
    })();
    return () => { cancelled = true; };
  }, [user?.id, today]);

  // ─── Open / closed ──────────────────────────────────────────────────────
  // Auto-open on first visit of the day, when standard not confirmed,
  // when there are unacknowledged pressure events, or after day rollover.
  const hasAlerts = (allEvents?.length ?? 0) > 0;
  const stampedDate = safeGet(COLLAPSE_KEY);
  const initialOpen = !(stampedDate === today)
    || standardConfirmed === false
    || hasAlerts;
  const [open, setOpen] = useState<boolean>(initialOpen);

  // Re-evaluate when async state arrives (standardConfirmed loads after mount)
  useEffect(() => {
    if (standardConfirmed === false || hasAlerts) setOpen(true);
  }, [standardConfirmed, hasAlerts]);

  // Day rollover: re-open the next day even if collapsed previously.
  useEffect(() => {
    const stamped = safeGet(COLLAPSE_KEY);
    if (stamped && stamped !== today) {
      setOpen(true);
    }
  }, [today]);

  const stampCollapsed = () => safeSet(COLLAPSE_KEY, today);
  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (!next) stampCollapsed();
      return next;
    });
  };

  // ─── Day intent handler ─────────────────────────────────────────────────
  const [busyDay, setBusyDay] = useState(false);
  const handleDayClick = async (target: 'rest' | 'skip' | 'push') => {
    if (busyDay) return;
    setBusyDay(true);
    try {
      const nextType = dayType === target ? null : target;
      if (nextType === 'rest' && restBudgetLeft <= 0) {
        toast.warning('Rest budget exceeded', { description: 'Extra rest counts as missed.' });
      }
      await setDayType(nextType);
      const msgs: Record<string, string> = {
        rest: 'Rest day set — streak protected.',
        skip: 'Skip day set — day will not count.',
        push: 'Push day set — extra load expected.',
      };
      toast.success(nextType ? msgs[nextType] : 'Standard day restored.');
    } finally {
      setBusyDay(false);
    }
  };

  // ─── Confirm standard ────────────────────────────────────────────────────
  const handleConfirmStandard = async () => {
    if (!user) return;
    await (supabase as any)
      .from('daily_standard_checks')
      .insert({ user_id: user.id, check_date: today, tier_at_confirm: tier });
    setStandardConfirmed(true);
    toast.success(`Standard confirmed. ${label}.`);
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
  const dayMeta = DAY_META[dayType];
  const hasUnreadAlert = !!activeEvent;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border-2 bg-card text-foreground shadow-lg',
          ring, className,
        )}
      >
        {/* Tier accent overlay (subtle, doesn't kill contrast) */}
        <div className={cn('pointer-events-none absolute inset-0 opacity-60 bg-gradient-to-br', bg)} />
        {/* Top tier-color accent bar */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-1 bg-primary/80" />

        {/* ─── Always-visible header (acts as the toggle) ──────────────── */}
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={open}
          aria-label={open ? 'Collapse identity card' : 'Open identity card'}
          className="relative w-full text-left px-3 sm:px-4 py-3 hover:bg-background/30 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70">
                  Identity
                </span>
                {dayType !== 'standard' && (
                  <span
                    className={cn(
                      'text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border',
                      dayMeta.chipClass,
                    )}
                  >
                    {dayMeta.label} day
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-end justify-between gap-3 sm:block">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={cn('text-2xl font-black tracking-tight leading-tight sm:text-2xl break-words drop-shadow-sm', tone)}>
                      {label}
                    </span>
                    {standardConfirmed && (
                      <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                        ✓ Confirmed
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile-only score */}
                <div className="flex flex-col items-end shrink-0 sm:hidden">
                  <div className={cn(
                    'rounded-lg bg-background/85 ring-1 ring-border px-2.5 py-1',
                    'text-3xl font-black tabular-nums leading-none',
                    tone,
                  )}>
                    {score}
                  </div>
                  <div className="mt-1 text-[9px] font-black uppercase tracking-widest text-foreground/70">
                    Consistency
                  </div>
                </div>
              </div>
            </div>

            {/* Right column on sm+ */}
            <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
              <div className={cn(
                'rounded-lg bg-background/85 ring-1 ring-border px-2.5 py-1',
                'text-3xl font-black tabular-nums leading-none',
                tone,
              )}>
                {score}
              </div>
              <div className="text-[9px] font-black uppercase tracking-widest text-foreground/70">
                Consistency
              </div>
            </div>

            {/* Chevron */}
            <div className="relative shrink-0 self-start pt-0.5">
              {hasUnreadAlert && !open && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-background animate-pulse" />
              )}
              <ChevronDown
                className={cn(
                  'h-5 w-5 text-foreground/80 transition-transform',
                  open && 'rotate-180',
                )}
              />
            </div>
          </div>

          {/* Row 3: streak chips */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-full bg-background/90 ring-1 ring-border px-2 py-0.5 font-bold text-foreground">
              <Flame className="h-3 w-3 text-orange-400" />
              {perfStreak}d perf
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-background/90 ring-1 ring-border px-2 py-0.5 font-bold text-foreground">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              {discStreak}d active
            </span>
            {nnMiss > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 ring-1 ring-rose-500/40 px-2 py-0.5 font-bold text-rose-300">
                {nnMiss} miss/7d
              </span>
            )}
          </div>
        </button>

        {/* ─── Expanded panel ─────────────────────────────────────────── */}
        <Collapsible open={open}>
          <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            <div className="px-3 sm:px-4 pb-4 pt-1 space-y-4 border-t border-border/40">

              {/* ── 1. Today's Standard ──────────────────────────────── */}
              <section>
                <SectionHeader
                  title="Today's Standard"
                  helpText={
                    `Your tier is ${label}. Confirming declares you're holding yourself to it today. ` +
                    `A confirmed standard with all Non-Negotiables met locks your streak. ` +
                    `A confirmed-but-missed day applies pressure to your identity score.`
                  }
                />
                {standardConfirmed ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="text-sm font-bold text-emerald-300">
                      Standard confirmed for today.
                    </span>
                  </div>
                ) : (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 space-y-2.5">
                    <p className="text-xs text-foreground/85 leading-relaxed">
                      You're being held to the{' '}
                      <span className={cn('font-black', tone)}>{label}</span> standard today.
                      Tap Confirm to lock in that you're operating at it.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleConfirmStandard}
                      className="w-full font-bold"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Confirm I'm at this standard
                    </Button>
                  </div>
                )}
              </section>

              {/* ── 2. Day Intent ────────────────────────────────────── */}
              <section>
                <SectionHeader
                  title="Day Intent"
                  helpText="Tell the engine how today should count. Rest protects the streak and waives Non-Negotiables. Skip ignores the day with no recovery credit. Push raises the bar with extra output expected."
                />
                <div className="grid grid-cols-3 gap-2">
                  <DayButton
                    label="Rest" Icon={Moon}
                    active={dayType === 'rest'} disabled={busyDay}
                    activeClass="bg-sky-600 hover:bg-sky-600/90 text-white border-sky-600"
                    onClick={() => handleDayClick('rest')}
                  />
                  <DayButton
                    label="Skip" Icon={SkipForward}
                    active={dayType === 'skip'} disabled={busyDay}
                    activeClass="bg-muted-foreground hover:bg-muted-foreground/90 text-background border-muted-foreground"
                    onClick={() => handleDayClick('skip')}
                  />
                  <DayButton
                    label="Push" Icon={Flame}
                    active={dayType === 'push'} disabled={busyDay}
                    activeClass="bg-amber-600 hover:bg-amber-600/90 text-white border-amber-600"
                    onClick={() => handleDayClick('push')}
                  />
                </div>
                <p className="mt-2 text-xs text-foreground/85 leading-relaxed">
                  {dayMeta.explanation}
                </p>
                <div className="mt-2 flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5 text-[11px]">
                  {overBudget ? (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span className="font-bold text-rose-400">
                        {usedThisWeek}/{maxPerWeek} rest used — over budget.
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="font-semibold">
                        {usedThisWeek}/{maxPerWeek} rest used this week
                      </span>
                    </>
                  )}
                </div>
              </section>

              {/* ── 3. Active Alerts ─────────────────────────────────── */}
              <section>
                <SectionHeader
                  title="Active Alerts"
                  helpText="Time-sensitive pressure events from the engine. Each alert tells you exactly what to do. Acting clears it; ignoring it chips at your consistency."
                />
                {allEvents && allEvents.length > 0 ? (
                  <div className="space-y-1.5">
                    {allEvents.slice(0, 4).map((ev) => {
                      const { text, tone: t, Icon } = formatEvent(ev);
                      const actionType = ev.action_type ?? null;
                      const actionLabel = actionType ? ACTION_LABELS[actionType] ?? 'Act' : null;
                      return (
                        <div
                          key={ev.id}
                          className={cn(
                            'rounded-lg border px-2.5 py-2 text-xs font-semibold',
                            'flex flex-col gap-2 sm:flex-row sm:items-center',
                            t,
                          )}
                          role="status"
                        >
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span className="flex-1 min-w-0 leading-snug break-words">{text}</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); acknowledge(ev.id); }}
                              aria-label="Dismiss"
                              className="h-5 w-5 rounded grid place-items-center text-current hover:bg-white/10 shrink-0 sm:hidden"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          {actionType && (
                            <Button
                              size="sm"
                              onClick={() => handleEventAction(ev)}
                              disabled={running}
                              className="h-7 px-2 gap-1 bg-white/15 hover:bg-white/25 text-current border-0 font-bold text-[10px] w-full sm:w-auto sm:h-6"
                            >
                              <Zap className="h-3 w-3" />
                              {actionLabel}
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => acknowledge(ev.id)}
                            aria-label="Dismiss"
                            className="h-5 w-5 rounded grid place-items-center text-current hover:bg-white/10 shrink-0 hidden sm:grid"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    All clear. Standard intact.
                  </div>
                )}
              </section>

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

function DayButton({
  label, Icon, active, disabled, activeClass, onClick,
}: {
  label: string; Icon: any; active: boolean; disabled: boolean;
  activeClass: string; onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'h-10 gap-1 sm:gap-1.5 px-1 sm:px-3 text-[11px] sm:text-xs font-black',
        active && activeClass,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label.toUpperCase()}</span>
    </Button>
  );
}
