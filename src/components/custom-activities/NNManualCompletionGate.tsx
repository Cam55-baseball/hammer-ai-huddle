// Phase 12.2 — Gated manual NN completion controls.
// Renders timer / count / binary controls inside an NN card body when the
// template's completion contract is `manual`. The gate must be satisfied
// before `onSatisfied` fires — no blind tap-to-complete allowed.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Play, Pause, RotateCcw, Check, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NNCompletionBinding } from '@/types/customActivity';

interface Props {
  templateId: string;
  binding: NNCompletionBinding;
  successCriteria: string;
  /** Called once gate is satisfied. Receives auditable gate metadata. */
  onSatisfied: (gate: { type: string; satisfied_at: string; [k: string]: any }) => void;
  /** Disable interaction (e.g. when already completed). */
  disabled?: boolean;
}

const fmt = (s: number) => {
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

const timerKey = (templateId: string) => {
  const day = new Date().toISOString().slice(0, 10);
  return `nn-timer:${templateId}:${day}`;
};

export function NNManualCompletionGate({
  templateId,
  binding,
  successCriteria,
  onSatisfied,
  disabled,
}: Props) {
  if (binding?.kind !== 'manual') return null;
  const rule = binding.rule;

  if (rule.type === 'timer') {
    return (
      <TimerGate
        templateId={templateId}
        seconds={rule.min_seconds}
        onSatisfied={onSatisfied}
        disabled={disabled}
      />
    );
  }
  if (rule.type === 'count') {
    return (
      <CountGate
        min={rule.min_count}
        label={rule.label}
        onSatisfied={onSatisfied}
        disabled={disabled}
      />
    );
  }
  if (rule.type === 'binary') {
    return (
      <BinaryGate
        confirmLabel={rule.confirm_label}
        successCriteria={successCriteria}
        onSatisfied={onSatisfied}
        disabled={disabled}
      />
    );
  }
  return null;
}

/* ---------------- Timer ---------------- */

function TimerGate({
  templateId,
  seconds,
  onSatisfied,
  disabled,
}: {
  templateId: string;
  seconds: number;
  onSatisfied: Props['onSatisfied'];
  disabled?: boolean;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  // Resume from localStorage if user refreshed mid-timer.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(timerKey(templateId));
      if (!raw) return;
      const { startedAt } = JSON.parse(raw) as { startedAt: number };
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      if (elapsed >= seconds) {
        setRemaining(0);
        setDone(true);
        return;
      }
      startedAtRef.current = startedAt;
      setRemaining(seconds - elapsed);
      setRunning(true);
    } catch {/* ignore */}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, seconds]);

  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(tickRef.current!);
          tickRef.current = null;
          setRunning(false);
          setDone(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [running]);

  const handleStart = () => {
    if (disabled || done) return;
    startedAtRef.current = Date.now() - (seconds - remaining) * 1000;
    try {
      localStorage.setItem(
        timerKey(templateId),
        JSON.stringify({ startedAt: startedAtRef.current }),
      );
    } catch {/* ignore */}
    setRunning(true);
  };

  const handlePause = () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    setRunning(false);
  };

  const handleReset = () => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    try { localStorage.removeItem(timerKey(templateId)); } catch {/* ignore */}
    setRemaining(seconds);
    setRunning(false);
    setDone(false);
    startedAtRef.current = null;
  };

  const handleComplete = () => {
    try { localStorage.removeItem(timerKey(templateId)); } catch {/* ignore */}
    onSatisfied({
      type: 'timer',
      seconds,
      satisfied_at: new Date().toISOString(),
    });
  };

  const pct = ((seconds - remaining) / seconds) * 100;

  return (
    <div
      className="mt-2 rounded-md border border-white/10 bg-black/20 p-2"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-base text-white tabular-nums">{fmt(remaining)}</span>
          <span className="text-[10px] uppercase tracking-wider text-white/40">
            {done ? 'ready' : running ? 'running' : 'tap start'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!running && !done && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-white/80 hover:text-white"
              onClick={handleStart}
              disabled={disabled}
            >
              <Play className="h-3.5 w-3.5 mr-1" /> Start
            </Button>
          )}
          {running && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-white/80 hover:text-white"
              onClick={handlePause}
            >
              <Pause className="h-3.5 w-3.5" />
            </Button>
          )}
          {(running || done || remaining < seconds) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-white/60 hover:text-white"
              onClick={handleReset}
              title="Reset"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            className={cn(
              "h-7 px-2",
              done
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-white/10 text-white/40 cursor-not-allowed"
            )}
            onClick={done ? handleComplete : undefined}
            disabled={!done || disabled}
          >
            <Check className="h-3.5 w-3.5 mr-1" /> Complete
          </Button>
        </div>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={cn("h-full transition-all", done ? "bg-green-500" : "bg-white/60")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------- Count ---------------- */

function CountGate({
  min,
  label,
  onSatisfied,
  disabled,
}: {
  min: number;
  label: string;
  onSatisfied: Props['onSatisfied'];
  disabled?: boolean;
}) {
  const [count, setCount] = useState<number>(0);
  const ready = count >= min;

  return (
    <div
      className="mt-2 rounded-md border border-white/10 bg-black/20 p-2"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-white/70 hover:text-white"
            onClick={() => setCount((c) => Math.max(0, c - 1))}
            disabled={disabled}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Input
            type="number"
            inputMode="numeric"
            value={count}
            onChange={(e) => setCount(Math.max(0, parseInt(e.target.value || '0', 10)))}
            className="h-7 w-14 bg-black/30 border-white/15 text-white text-center px-1"
            disabled={disabled}
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-white/70 hover:text-white"
            onClick={() => setCount((c) => c + 1)}
            disabled={disabled}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[11px] text-white/60">
            {label} <span className="text-white/40">/ {min} min</span>
          </span>
        </div>
        <Button
          size="sm"
          className={cn(
            "h-7 px-2",
            ready
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-white/10 text-white/40 cursor-not-allowed"
          )}
          onClick={
            ready
              ? () =>
                  onSatisfied({
                    type: 'count',
                    count,
                    min_count: min,
                    label,
                    satisfied_at: new Date().toISOString(),
                  })
              : undefined
          }
          disabled={!ready || disabled}
        >
          <Check className="h-3.5 w-3.5 mr-1" /> Log {min}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Binary ---------------- */

function BinaryGate({
  confirmLabel,
  successCriteria,
  onSatisfied,
  disabled,
}: {
  confirmLabel: string;
  successCriteria: string;
  onSatisfied: Props['onSatisfied'];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          className="h-7 px-2 bg-white/10 hover:bg-white/15 text-white"
          onClick={() => setOpen(true)}
          disabled={disabled}
        >
          <Check className="h-3.5 w-3.5 mr-1" /> {confirmLabel}
        </Button>
      </div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm completion</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block mb-2 text-foreground">{successCriteria}</span>
              <span className="text-muted-foreground text-sm">
                Tap Confirm only if this is true. This is logged.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setOpen(false);
                onSatisfied({
                  type: 'binary',
                  confirm_label: confirmLabel,
                  satisfied_at: new Date().toISOString(),
                });
              }}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
