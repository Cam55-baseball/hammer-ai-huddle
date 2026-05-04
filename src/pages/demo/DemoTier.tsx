import { useNavigate, useParams } from 'react-router-dom';
import { DemoLayout } from '@/components/demo/DemoLayout';
import { DemoCard } from '@/components/demo/DemoCard';
import { useDemoRegistry } from '@/hooks/useDemoRegistry';
import { useDemoProgress } from '@/hooks/useDemoProgress';

export default function DemoTier() {
  const { tier = '' } = useParams();
  const navigate = useNavigate();
  const { findBySlug, categoriesOf, submodulesOf } = useDemoRegistry();
  const { progress } = useDemoProgress();
  const tierNode = findBySlug(tier);
  const categories = categoriesOf(tier);

  if (!tierNode) {
    return (
      <DemoLayout showBack>
        <p className="text-sm text-muted-foreground">Tier not found.</p>
      </DemoLayout>
    );
  }

  return (
    <DemoLayout showBack>
      <div className="mb-5">
        <h1 className="text-2xl font-black">{tierNode.title}</h1>
        {tierNode.tagline && <p className="text-sm text-muted-foreground">{tierNode.tagline}</p>}
      </div>
      <div className="space-y-3">
        {categories.map(c => {
          const subs = submodulesOf(c.slug);
          const viewedCount = subs.filter(s => progress?.viewed_submodules.includes(s.slug)).length;
          return (
            <DemoCard
              key={c.id}
              title={c.title}
              tagline={c.tagline}
              iconName={c.icon_name}
              viewed={viewedCount === subs.length && subs.length > 0}
              trailing={`${viewedCount}/${subs.length}`}
              onClick={() => navigate(`/demo/${tier}/${c.slug}`)}
            />
          );
        })}
      </div>
    </DemoLayout>
  );
}
