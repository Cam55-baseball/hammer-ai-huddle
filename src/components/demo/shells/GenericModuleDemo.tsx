import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useDemoInteract } from '@/hooks/useDemoInteract';
import { DemoLoopShell } from '@/components/demo/DemoLoopShell';
import { AnimatedNumber } from '@/components/demo/viz/AnimatedNumber';
import { RadialDial } from '@/components/demo/viz/RadialDial';
import { PitchTunnelDiagram } from '@/components/demo/viz/diagrams/PitchTunnelDiagram';
import { CommandGridDiagram } from '@/components/demo/viz/diagrams/CommandGridDiagram';
import { SpeedTrackDiagram } from '@/components/demo/viz/diagrams/SpeedTrackDiagram';
import { HeatBlockDiagram } from '@/components/demo/viz/diagrams/HeatBlockDiagram';
import { MacroRingDiagram } from '@/components/demo/viz/diagrams/MacroRingDiagram';
import { RegulationGaugeDiagram } from '@/components/demo/viz/diagrams/RegulationGaugeDiagram';
import { TexVisionGridDiagram } from '@/components/demo/viz/diagrams/TexVisionGridDiagram';
import { CardStackDiagram } from '@/components/demo/viz/diagrams/CardStackDiagram';
import { moduleConfigs, type DiagramKey } from '@/demo/modules/configs';

interface Props { configKey: string; }

function Diagram({ kind, props }: { kind: DiagramKey; props: any }) {
  switch (kind) {
    case 'pitchTunnel': return <PitchTunnelDiagram {...props} />;
    case 'commandGrid': return <CommandGridDiagram {...props} />;
    case 'speedTrack': return <SpeedTrackDiagram {...props} />;
    case 'heatBlock': return <HeatBlockDiagram {...props} />;
    case 'macroRing': return <MacroRingDiagram {...props} />;
    case 'regulationGauge': return <RegulationGaugeDiagram {...props} />;
    case 'texGrid': return <TexVisionGridDiagram {...props} />;
    case 'cardStack': return <CardStackDiagram {...props} />;
    case 'radial': return <div className="flex justify-center"><RadialDial {...props} suffix="%" /></div>;
    default: return null;
  }
}

export default function GenericModuleDemo({ configKey }: Props) {
  const cfg = moduleConfigs[configKey];
  if (!cfg) return <p className="text-sm text-muted-foreground">Preview unavailable.</p>;

  const { user } = useAuth();
  const { bump } = useDemoInteract(cfg.fromSlug);
  const [state, setState] = useState<Record<string, any>>(() =>
    Object.fromEntries(cfg.inputs.map(i => [i.key, i.default])),
  );
  const result = useMemo(() => cfg.sim(state, user?.id ?? null), [cfg, state, user?.id]);
  const set = (k: string, v: any) => { setState(s => ({ ...s, [k]: v })); bump(); };

  return (
    <DemoLoopShell
      fromSlug={cfg.fromSlug}
      simId={cfg.simId}
      severity={result.benchmark.severity}
      gap={result.benchmark.gap}
      input={
        <Card>
          <CardContent className="space-y-3 p-4">
            {cfg.inputs.map(inp => (
              <div key={inp.key}>
                <p className="mb-1.5 text-xs font-bold uppercase text-muted-foreground">{inp.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {inp.options.map(o => (
                    <Button
                      key={String(o.value)} size="sm"
                      variant={state[inp.key] === o.value ? 'default' : 'outline'}
                      onClick={() => set(inp.key, o.value)}
                      className="capitalize"
                    >{o.label}</Button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      }
      diagnosis={
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{result.headline ?? 'Live diagnosis'}</h3>
              <Badge variant={result.benchmark.severity === 'critical' ? 'destructive' : 'secondary'}>
                {result.benchmark.severity}
              </Badge>
            </div>
            <Diagram kind={cfg.diagram} props={result.diagramProps} />
            <div className="grid grid-cols-3 gap-2 text-center">
              {result.stats.map(s => (
                <div key={s.label} className="rounded-md border bg-muted/30 p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-black">
                    <AnimatedNumber value={s.value} decimals={s.decimals ?? 0} suffix={s.unit} />
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      }
      benchmark={result.benchmark}
    />
  );
}
