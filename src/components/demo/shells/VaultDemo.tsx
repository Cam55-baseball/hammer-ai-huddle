import { useState } from 'react';
import { Lock, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DemoLoopShell } from '@/components/demo/DemoLoopShell';
import { useDemoInteract } from '@/hooks/useDemoInteract';

const TILES = [
  { id: 1, title: 'Hitting · Week 1', locked: false },
  { id: 2, title: 'Pitching · Week 1', locked: false },
  { id: 3, title: 'Hitting · Week 6', locked: true },
  { id: 4, title: 'Throwing · Week 4', locked: true },
  { id: 5, title: 'Speed Lab · 60yd', locked: true },
  { id: 6, title: 'Vault Recap · Month 3', locked: true },
];

export default function VaultDemo() {
  const [selected, setSelected] = useState<number | null>(null);
  const { bump } = useDemoInteract('vault');
  const lockedCount = TILES.filter(t => t.locked).length;

  return (
    <DemoLoopShell
      fromSlug="vault"
      simId="vault"
      severity="critical"
      gap={lockedCount}
      input={
        <Card>
          <CardContent className="p-3">
            <p className="mb-2 text-xs text-muted-foreground">Tap a thumbnail — see how the Vault stores your full history.</p>
            <div className="grid grid-cols-3 gap-2">
              {TILES.map(t => (
                <Card
                  key={t.id}
                  onClick={() => { setSelected(t.id); bump(); }}
                  className={`relative aspect-video cursor-pointer overflow-hidden bg-gradient-to-br from-muted to-muted/40 ${selected === t.id ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    {t.locked ? <Lock className="h-5 w-5 text-primary" /> : <Play className="h-5 w-5 text-primary" />}
                  </div>
                  <div className={`absolute inset-x-0 bottom-0 bg-background/80 px-1.5 py-0.5 text-[9px] font-bold ${t.locked ? 'blur-[1px]' : ''}`}>
                    {t.title}
                  </div>
                  {t.locked && <div className="absolute inset-0 bg-background/30 backdrop-blur-sm" />}
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      }
      diagnosis={
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">
              {selected ? 'Selected — but full playback and side-by-side compare are locked.' : 'Pick a tile to see what the Vault holds.'}
            </p>
          </CardContent>
        </Card>
      }
      benchmark={{
        yourLabel: 'Visible',
        yourValue: `${TILES.length - lockedCount}`,
        eliteLabel: 'Total',
        eliteValue: `${TILES.length}`,
        gapLabel: 'Locked',
        gapValue: `${lockedCount}`,
        projected: 'Unlock 100% of your performance history',
        whyItMatters: 'Without the Vault you only see your last week. Elite progression requires the full timeline.',
      }}
    />
  );
}
