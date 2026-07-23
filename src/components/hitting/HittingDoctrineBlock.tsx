/**
 * Hitting doctrine block — single source-of-truth renderer used by BOTH
 * athlete (WeaknessClusterCard) and coach (CoachAthleteDetail) surfaces.
 *
 * Reads `hie_snapshots.hitting_doctrine` (additive column) and renders the
 * canonical causal chain + 4-step roadmap. Confidence-bounded; renders an
 * explicit empty state when `confidence === 0` (no fabrication).
 *
 * Subordinate to Megaphase 111–150 human-coaching translation governance
 * (translation may compress, never fabricate; missingness preserved).
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HittingCausalChainCard } from '@/components/hitting/HittingCausalChainCard';
import { HittingRoadmapLadder } from '@/components/hitting/HittingRoadmapLadder';
import type { CausalChain, RoadmapStep } from '@/lib/hittingCausalChains';
import type { HittingPhaseId } from '@/lib/hittingPhases';

export interface HittingDoctrineBlockData {
  violated_phases: HittingPhaseId[];
  priority_phase: HittingPhaseId | null;
  causal_chains: Partial<Record<HittingPhaseId, CausalChain>>;
  roadmap: RoadmapStep[];
  confidence: number;
  missingness: {
    reason: string;
    missing_signals: string[];
    mapped_symptom_count: number;
  };
  engine_version: string;
}

interface Props {
  doctrine: HittingDoctrineBlockData | null | undefined;
  /** Title override — defaults to "Your hitting focus" for athletes. */
  title?: string;
}

const EMPTY_COPY: Record<string, string> = {
  no_hitting_clusters:
    "Not enough hitting reps yet — keep logging swings and we'll surface your priority phase here.",
  unmapped_clusters:
    "Your recent hitting signals don't map to a doctrine phase yet. Tag a few swings with phase symptoms (or upload video) to unlock attribution.",
  below_threshold:
    "Below minimum rep threshold for confident phase attribution. Log at least 5 hitting reps in a session.",
  sufficient:
    'Hitting doctrine ready — see causal chain and roadmap below.',
};

// Rotating philosophy reminders — sport-agnostic (baseball + softball share the same laws).
// Deterministic rotation by UTC day so athletes and coaches see the same reminder on the same day.
const PHILOSOPHY_REMINDERS: { title: string; body: string }[] = [
  {
    title: 'Back hip load = midline + power',
    body: 'Back hip load with hand load / scap pack coils the hip, creates the midline, and leaves the room to separate. A bigger leg load BEFORE the hand load unlocks more launch angle and more power.',
  },
  {
    title: "Top triangle → bottom triangle (Sadaharu Oh)",
    body: 'If the elbow moves forward with the hands staying back it creates a triangle. That top triangle makes the back knee turn forward — forming the bottom triangle in the back leg.',
  },
  {
    title: 'Only two things go forward at once',
    body: 'Either your elbow (or the front of your bicep) brings the barrel — with the hands staying back — or your hands bring the barrel. Elbow leading with hands back is the perfection version.',
  },
  {
    title: 'Square to fair',
    body: 'Taking your elbow (or the front of your bicep) to the ball with the hands back turns your barrel BEHIND the ball, which gets your bat square to fair — the shape the pros are actually describing.',
  },
  {
    title: 'On plane = low-effort velocity',
    body: 'Being on plane gives you a longer contact window. Hitters must catch velocity at low effort — hands back, elbow (or front of the bicep) forward. "Just late" is usually off-plane, not slow.',
  },
];

function pickPhilosophyReminder() {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return PHILOSOPHY_REMINDERS[dayIndex % PHILOSOPHY_REMINDERS.length];
}

export function HittingDoctrineBlock({ doctrine, title }: Props) {
  if (!doctrine) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {title ?? 'Hitting doctrine (P1-P4)'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No hitting doctrine attribution on file yet.
        </CardContent>
      </Card>
    );
  }

  const { priority_phase, causal_chains, roadmap, confidence, missingness } =
    doctrine;

  // Empty / missingness state. No fabrication — surface the reason verbatim.
  if (
    confidence === 0 ||
    !priority_phase ||
    !causal_chains[priority_phase] ||
    roadmap.length === 0
  ) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span>{title ?? 'Hitting doctrine (P1-P4)'}</span>
            <Badge variant="outline" className="text-[10px]">
              confidence 0
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {EMPTY_COPY[missingness.reason] ?? EMPTY_COPY.unmapped_clusters}
          </p>
          {missingness.missing_signals.length > 0 && (
            <ul className="text-[11px] text-muted-foreground/80 list-disc list-inside">
              {missingness.missing_signals.map((s) => (
                <li key={s}>
                  <code>{s}</code>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-muted-foreground/70">
            engine_version <code>{doctrine.engine_version}</code>
          </p>
        </CardContent>
      </Card>
    );
  }

  const chain = causal_chains[priority_phase]!;
  const reminder = pickPhilosophyReminder();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {title ?? 'Your hitting focus'}
        </h3>
        <Badge variant="outline" className="text-[10px]">
          confidence {Math.round(confidence * 100)}%
        </Badge>
      </div>
      <HittingCausalChainCard chain={chain} />
      <HittingRoadmapLadder roadmap={roadmap} />
      <div className="rounded-md border border-border/60 bg-muted/40 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Philosophy reminder · {reminder.title}
        </p>
        <p className="mt-1 text-xs text-foreground/90">{reminder.body}</p>
      </div>
      <p className="text-[10px] text-muted-foreground/70">
        engine_version <code>{doctrine.engine_version}</code> · violated{' '}
        {doctrine.violated_phases.join(', ') || '—'}
      </p>
    </div>
  );
}
