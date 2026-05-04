import { useNavigate, useParams } from 'react-router-dom';
import { DemoLayout } from '@/components/demo/DemoLayout';
import { DemoCard } from '@/components/demo/DemoCard';
import { useDemoRegistry } from '@/hooks/useDemoRegistry';
import { useDemoProgress } from '@/hooks/useDemoProgress';

export default function DemoCategory() {
  const { tier = '', category = '' } = useParams();
  const navigate = useNavigate();
  const { findBySlug, submodulesOf } = useDemoRegistry();
  const { progress } = useDemoProgress();
  const cat = findBySlug(category);
  const subs = submodulesOf(category);

  if (!cat) {
    return (
      <DemoLayout showBack>
        <p className="text-sm text-muted-foreground">Category not found.</p>
      </DemoLayout>
    );
  }

  return (
    <DemoLayout showBack>
      <div className="mb-5">
        <h1 className="text-2xl font-black">{cat.title}</h1>
        {cat.tagline && <p className="text-sm text-muted-foreground">{cat.tagline}</p>}
      </div>
      <div className="space-y-3">
        {subs.map(s => (
          <DemoCard
            key={s.id}
            title={s.title}
            tagline={s.tagline}
            iconName={s.icon_name}
            viewed={progress?.viewed_submodules.includes(s.slug)}
            onClick={() => navigate(`/demo/${tier}/${category}/${s.slug}`)}
          />
        ))}
      </div>
    </DemoLayout>
  );
}
