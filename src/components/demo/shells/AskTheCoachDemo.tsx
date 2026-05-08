import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, MessageCircle, Lock, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

type Msg = { role: 'user' | 'coach'; content: string; evidence?: Evidence };
type Evidence =
  | { kind: 'bars'; title: string; rows: { label: string; value: number; suffix?: string }[] }
  | { kind: 'gauge'; title: string; label: string; value: number; tone: 'red' | 'amber' | 'green' }
  | { kind: 'plan'; title: string; blocks: { time: string; label: string }[] }
  | { kind: 'note'; title: string; body: string };

type Scripted = { prompt: string; reply: string; evidence?: Evidence };

const SCRIPTS: Scripted[] = [
  {
    prompt: "Show my team's weakest hitters this week",
    reply:
      "Three hitters slipped this week. Driver: P4 Hitter's Move soft cap (≤70). Prescribe Iso → Constrain progression on tee, then live BP. I'll auto-assign the drill block to their next session.",
    evidence: {
      kind: 'bars',
      title: 'Lowest BQI · last 7 days',
      rows: [
        { label: '#12 Reyes', value: 58 },
        { label: '#7 Cole', value: 61 },
        { label: '#22 Vega', value: 64 },
      ],
    },
  },
  {
    prompt: 'Which pitchers are at CNS overload risk?',
    reply:
      'Two pitchers are trending into red zone. Recommend cap bullpen volume at 25 throws and skip live BP today. Regulation index has been < 60 for 3 straight days on both.',
    evidence: { kind: 'gauge', title: '#9 Mendez · CNS load', label: 'Overload risk', value: 86, tone: 'red' },
  },
  {
    prompt: 'Build a 45-min team practice for tomorrow',
    reply:
      'Built around team-wide P4 weakness and 2 elevated CNS profiles. Tee → constraint → live progression, with parallel defense rotation so high-load arms stay short.',
    evidence: {
      kind: 'plan',
      title: 'Tomorrow · 45 min',
      blocks: [
        { time: '0:00', label: 'Activation + Tex Vision (8 min)' },
        { time: '0:08', label: 'Tee P4 iso block (12 min)' },
        { time: '0:20', label: 'Constrained BP rotation (15 min)' },
        { time: '0:35', label: 'Defense reads + cooldown (10 min)' },
      ],
    },
  },
  {
    prompt: 'Who improved most in the last 14 days?',
    reply:
      "#4 Patel jumped +18 MPI, driven by a clean P1 Hip Load rebuild. Worth a public shout — habit lock-in is highest right after recognition.",
    evidence: {
      kind: 'bars',
      title: 'Top MPI gainers · 14d',
      rows: [
        { label: '#4 Patel', value: 18, suffix: ' pts' },
        { label: '#15 Brooks', value: 11, suffix: ' pts' },
        { label: '#3 Otani', value: 9, suffix: ' pts' },
      ],
    },
  },
  {
    prompt: 'Flag athletes missing nutrition logs',
    reply:
      "5 athletes haven't logged a meal in 3+ days. Strongest correlation in your roster: missed logs → -7% next-session BQI. I can DM them a one-tap log nudge.",
    evidence: {
      kind: 'bars',
      title: 'Days since last meal log',
      rows: [
        { label: '#22 Vega', value: 6, suffix: 'd' },
        { label: '#7 Cole', value: 4, suffix: 'd' },
        { label: '#19 Tan', value: 4, suffix: 'd' },
      ],
    },
  },
  {
    prompt: 'Generate a coaching note on player #12',
    reply:
      "Reyes (#12) · OF · 16. Trigger: hands break early under fastball tempo. Cause: P1 Hip Load deficit. Mechanism: bat drag through zone. Result: late contact, weak pull side. Fix: 4-step Feel→Iso→Constrain→Transfer block, 2x/week.",
    evidence: {
      kind: 'note',
      title: 'Coach note · Reyes #12',
      body: 'Push: P1 iso tee work. Pull: live BP volume until BQI clears 70. Re-test in 14 days.',
    },
  },
];

function EvidenceCard({ ev }: { ev: Evidence }) {
  if (ev.kind === 'bars') {
    const max = Math.max(...ev.rows.map((r) => r.value));
    return (
      <div className="rounded-md border bg-muted/30 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{ev.title}</p>
        <div className="space-y-1.5">
          {ev.rows.map((r) => (
            <div key={r.label} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 truncate font-medium">{r.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
              <span className="w-14 shrink-0 text-right font-mono text-[11px]">
                {r.value}
                {r.suffix ?? ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (ev.kind === 'gauge') {
    const tone =
      ev.tone === 'red' ? 'text-destructive' : ev.tone === 'amber' ? 'text-amber-500' : 'text-emerald-500';
    return (
      <div className="rounded-md border bg-muted/30 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{ev.title}</p>
        <div className="flex items-baseline justify-between">
          <span className="text-xs">{ev.label}</span>
          <span className={cn('text-2xl font-black', tone)}>{ev.value}</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full',
              ev.tone === 'red' ? 'bg-destructive' : ev.tone === 'amber' ? 'bg-amber-500' : 'bg-emerald-500',
            )}
            style={{ width: `${ev.value}%` }}
          />
        </div>
      </div>
    );
  }
  if (ev.kind === 'plan') {
    return (
      <div className="rounded-md border bg-muted/30 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{ev.title}</p>
        <ul className="space-y-1 text-xs">
          {ev.blocks.map((b) => (
            <li key={b.time} className="flex gap-2">
              <span className="w-10 shrink-0 font-mono text-muted-foreground">{b.time}</span>
              <span>{b.label}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{ev.title}</p>
      <p className="text-xs leading-relaxed">{ev.body}</p>
    </div>
  );
}

export default function AskTheCoachDemo() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(
    () => () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  const playScript = (s: Scripted) => {
    if (streaming) return;
    setStreaming(true);
    setMessages((prev) => [...prev, { role: 'user', content: s.prompt }, { role: 'coach', content: '' }]);
    const tokens = s.reply.split(/(\s+)/);
    let i = 0;
    const tick = () => {
      i += 1;
      const partial = tokens.slice(0, i).join('');
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: 'coach', content: partial };
        return next;
      });
      if (i < tokens.length) {
        timersRef.current.push(window.setTimeout(tick, 28));
      } else {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], evidence: s.evidence };
          return next;
        });
        setStreaming(false);
      }
    };
    timersRef.current.push(window.setTimeout(tick, 200));
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">Ask the Coach</span>
            <Badge variant="secondary" className="text-[10px]">
              Coach view
            </Badge>
          </div>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Lock className="h-3 w-3" /> Preview
          </Badge>
        </div>

        <div ref={scrollRef} className="h-[340px] space-y-3 overflow-y-auto p-3">
          {messages.length === 0 && (
            <div className="space-y-3 py-4 text-center">
              <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground opacity-40" />
              <p className="text-xs text-muted-foreground">
                Tap a question to see what coaches can do with Hammers Modality.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[88%] space-y-2 rounded-lg px-3 py-2 text-sm',
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.content || '…'}</p>
                {m.evidence && <EvidenceCard ev={m.evidence} />}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Try a coach question
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SCRIPTS.map((s) => (
              <Button
                key={s.prompt}
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => playScript(s)}
                disabled={streaming}
              >
                {s.prompt}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 border-t bg-muted/30 px-3 py-2">
          <Lock className="h-3 w-3 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">
            Preview only — full Coach Hub unlocks with a Coach seat.
          </p>
          <Button size="sm" variant="ghost" className="ml-auto h-7 gap-1 text-[11px]" disabled>
            <Send className="h-3 w-3" /> Type a question
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
