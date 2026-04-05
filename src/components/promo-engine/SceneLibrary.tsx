import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Filter, AlertTriangle } from 'lucide-react';
import { usePromoScenes, useUpdateSceneStatus, type PromoScene } from '@/hooks/usePromoEngine';
import { SceneCard } from './SceneCard';
import { ScenePreview } from './ScenePreview';
import { cn } from '@/lib/utils';

const FEATURE_AREAS = ['all', 'dashboard', 'tex-vision', 'vault', 'mpi', 'video-library', 'game-scoring', 'practice-hub', 'hook', 'cta', 'proof'];

export const SceneLibrary = () => {
  const { data: scenes = [], isLoading } = usePromoScenes();
  const updateStatus = useUpdateSceneStatus();
  const [search, setSearch] = useState('');
  const [featureFilter, setFeatureFilter] = useState('all');
  const [previewScene, setPreviewScene] = useState<PromoScene | null>(null);

  const outdatedCount = scenes.filter(s => s.status === 'outdated').length;

  const filtered = scenes.filter(s => {
    if (featureFilter !== 'all' && s.feature_area !== featureFilter) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !s.scene_key.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="secondary" className="text-sm">{scenes.length} scenes</Badge>
        {outdatedCount > 0 && (
          <Badge variant="destructive" className="text-sm gap-1">
            <AlertTriangle className="h-3 w-3" /> {outdatedCount} outdated
          </Badge>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search scenes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Feature area pills */}
      <div className="flex gap-2 flex-wrap">
        {FEATURE_AREAS.map(area => (
          <Button
            key={area}
            variant={featureFilter === area ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs capitalize"
            onClick={() => setFeatureFilter(area)}
          >
            {area === 'all' ? 'All' : area}
          </Button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Grid */}
        <div className={cn('flex-1 grid gap-4', previewScene ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4')}>
          {filtered.map(scene => (
            <SceneCard
              key={scene.id}
              scene={scene}
              onPreview={setPreviewScene}
              onFlagOutdated={(s) => updateStatus.mutate({ id: s.id, status: 'outdated' })}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No scenes match your filters
            </div>
          )}
        </div>

        {/* Preview panel */}
        {previewScene && (
          <div className="w-96 shrink-0 hidden lg:block">
            <ScenePreview scene={previewScene} onClose={() => setPreviewScene(null)} />
          </div>
        )}
      </div>
    </div>
  );
};
