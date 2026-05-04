import { useNavigate } from 'react-router-dom';
import { Lock, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';

const TILES = [
  { id: 1, title: 'Hitting · Week 1', locked: false },
  { id: 2, title: 'Pitching · Week 1', locked: false },
  { id: 3, title: 'Hitting · Week 6', locked: true },
  { id: 4, title: 'Throwing · Week 4', locked: true },
  { id: 5, title: 'Speed Lab · 60yd', locked: true },
  { id: 6, title: 'Vault Recap · Month 3', locked: true },
];

export default function VaultDemo() {
  const navigate = useNavigate();
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        Your full training history with side-by-side video — here's a sample.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TILES.map(t => (
          <Card
            key={t.id}
            onClick={() => t.locked && navigate('/demo/upgrade?from=vault')}
            className={`relative aspect-video cursor-pointer overflow-hidden bg-gradient-to-br from-muted to-muted/40`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {t.locked ? (
                <Lock className="h-6 w-6 text-primary" />
              ) : (
                <Play className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className={`absolute inset-x-0 bottom-0 bg-background/80 px-2 py-1 text-[10px] font-bold ${t.locked ? 'blur-[1px]' : ''}`}>
              {t.title}
            </div>
            {t.locked && <div className="absolute inset-0 bg-background/30 backdrop-blur-sm" />}
          </Card>
        ))}
      </div>
    </div>
  );
}
