import { useNavigate } from 'react-router-dom';
import { DemoLayout } from '@/components/demo/DemoLayout';
import { DemoCard } from '@/components/demo/DemoCard';
import { useDemoRegistry } from '@/hooks/useDemoRegistry';
import { useDemoProgress } from '@/hooks/useDemoProgress';
import { TIER_CONFIG } from '@/constants/tiers';
import { useEffect } from 'react';

export default function DemoRoot() {
  const navigate = useNavigate();
  const { tiers, loading } = useDemoRegistry();
  const { progress, startIfPending } = useDemoProgress();

  useEffect(() => { void startIfPending(); }, [startIfPending]);

  return (
    <DemoLayout>
      <div className="mb-5">
        <h1 className="text-2xl font-black">Pick a Path</h1>
        <p className="text-sm text-muted-foreground">Tap any tier to preview every feature inside it. Nothing saves — it's all for show.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3">
          {tiers.map(t => {
            const cfg = TIER_CONFIG[t.slug];
            const viewed = progress?.viewed_tiers.includes(t.slug);
            return (
              <DemoCard
                key={t.id}
                title={t.title}
                tagline={t.tagline}
                iconName={t.icon_name}
                viewed={viewed}
                trailing={cfg ? `$${cfg.price}/mo` : undefined}
                onClick={() => navigate(`/demo/${t.slug}`)}
              />
            );
          })}
        </div>
      )}
    </DemoLayout>
  );
}
