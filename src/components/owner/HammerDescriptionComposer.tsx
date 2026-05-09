import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Pencil, Wand2 } from 'lucide-react';

/**
 * Tap-only composer for the Hammer description (the engine-readable text).
 * The owner picks one chip per row; we compose a clean sentence and write it
 * back through `onChange`. An "Edit text" toggle reveals the raw textarea
 * for the rare override case — overrides are stored as-is.
 */

export const HAMMER_AUDIENCE = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'] as const;
export const HAMMER_BEST_FOR = [
  'Common Fault Fix',
  'Skill Build',
  'Mechanic Reinforcement',
  'Game-Speed Rep',
  'Diagnostic',
] as const;
export const HAMMER_FOCUS = [
  'Sequencing',
  'Timing',
  'Power',
  'Direction',
  'Vision',
  'Decision',
  'Recovery',
  'Mobility',
] as const;
export const HAMMER_CAUSE = [
  'Early hands',
  'Lower-half stall',
  'Bat drag',
  'Posture loss',
  'Glove drift',
  'Front-side fly-open',
  'None / N/A',
] as const;

export interface HammerComposerState {
  audience?: string;
  bestFor?: string;
  focus?: string;
  cause?: string;
}

export function composeHammerDescription(s: HammerComposerState): string {
  if (!s.audience && !s.bestFor && !s.focus && !s.cause) return '';
  const aud = s.audience ?? 'All Levels';
  const best = s.bestFor ?? 'Skill Build';
  const focus = s.focus ?? 'Sequencing';
  const parts = [
    `Best for ${aud} athletes working on a ${best}.`,
    `Focus: ${focus}.`,
  ];
  if (s.cause && s.cause !== 'None / N/A') parts.push(`Common cause: ${s.cause}.`);
  return parts.join(' ');
}

/** Heuristic: did this string come from the composer? Lets us re-hydrate chips. */
export function parseHammerDescription(text: string): HammerComposerState | null {
  if (!text) return null;
  const m = text.match(
    /^Best for (.+?) athletes working on a (.+?)\.\s+Focus: (.+?)\.(?:\s+Common cause: (.+?)\.)?$/,
  );
  if (!m) return null;
  return {
    audience: m[1],
    bestFor: m[2],
    focus: m[3],
    cause: m[4] ?? 'None / N/A',
  };
}

interface Props {
  /** Current persisted text (read-only — composer writes through onChange). */
  value: string;
  onChange: (next: string) => void;
  compact?: boolean;
}

export function HammerDescriptionComposer({ value, onChange, compact = false }: Props) {
  // If existing text doesn't match composer pattern, treat as a manual override.
  const parsedFromValue = useMemo(() => parseHammerDescription(value), [value]);
  const [override, setOverride] = useState<boolean>(() => value.trim().length > 0 && !parsedFromValue);
  const [state, setState] = useState<HammerComposerState>(parsedFromValue ?? {});

  // Keep composed text in sync with chip state (only when not in override mode).
  useEffect(() => {
    if (override) return;
    onChange(composeHammerDescription(state));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, override]);

  const pick = (key: keyof HammerComposerState, val: string) =>
    setState(prev => ({ ...prev, [key]: prev[key] === val ? undefined : val }));

  const ready = !!(state.audience && state.bestFor && state.focus);

  if (override) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Hammer Description (custom override)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-[10px]"
            onClick={() => {
              setOverride(false);
              setState({});
              onChange('');
            }}
          >
            <Wand2 className="h-3 w-3 mr-1" /> Use chip composer
          </Button>
        </div>
        <Textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={compact ? 2 : 3}
          className="text-xs"
          placeholder="Custom Hammer description…"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Hammer Description (tap chips — required)</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] text-muted-foreground"
          onClick={() => setOverride(true)}
        >
          <Pencil className="h-3 w-3 mr-1" /> Edit text
        </Button>
      </div>

      <ChipRow label="Audience" options={HAMMER_AUDIENCE as any} selected={state.audience} onPick={v => pick('audience', v)} required />
      <ChipRow label="Best For" options={HAMMER_BEST_FOR as any} selected={state.bestFor} onPick={v => pick('bestFor', v)} required />
      <ChipRow label="Focus" options={HAMMER_FOCUS as any} selected={state.focus} onPick={v => pick('focus', v)} required />
      <ChipRow label="Common Cause" options={HAMMER_CAUSE as any} selected={state.cause} onPick={v => pick('cause', v)} />

      <div className="rounded border bg-background/60 p-2 text-[11px] leading-snug min-h-[2.25rem]">
        {ready ? (
          <span className="text-foreground">{composeHammerDescription(state)}</span>
        ) : (
          <span className="text-muted-foreground italic">Pick Audience + Best For + Focus to compose the description.</span>
        )}
      </div>
    </div>
  );
}

function ChipRow({
  label,
  options,
  selected,
  onPick,
  required,
}: {
  label: string;
  options: readonly string[];
  selected?: string;
  onPick: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}{required ? ' *' : ''}
      </p>
      <div className="flex flex-wrap gap-1">
        {options.map(opt => (
          <Badge
            key={opt}
            variant={selected === opt ? 'default' : 'outline'}
            className="cursor-pointer text-[10px]"
            onClick={() => onPick(opt)}
          >
            {opt}
          </Badge>
        ))}
      </div>
    </div>
  );
}
