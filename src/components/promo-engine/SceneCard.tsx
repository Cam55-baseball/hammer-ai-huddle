import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, Eye, Flag } from 'lucide-react';
import type { PromoScene } from '@/hooks/usePromoEngine';
import { cn } from '@/lib/utils';

const FEATURE_COLORS: Record<string, string> = {
  dashboard: 'bg-blue-500/10 text-blue-500',
  'tex-vision': 'bg-emerald-500/10 text-emerald-500',
  vault: 'bg-purple-500/10 text-purple-500',
  mpi: 'bg-amber-500/10 text-amber-500',
  'video-library': 'bg-rose-500/10 text-rose-500',
  'game-scoring': 'bg-cyan-500/10 text-cyan-500',
  'practice-hub': 'bg-orange-500/10 text-orange-500',
  hook: 'bg-red-500/10 text-red-500',
  cta: 'bg-green-500/10 text-green-500',
  proof: 'bg-indigo-500/10 text-indigo-500',
};

interface SceneCardProps {
  scene: PromoScene;
  onPreview?: (scene: PromoScene) => void;
  onFlagOutdated?: (scene: PromoScene) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (scene: PromoScene) => void;
}

export const SceneCard = ({ scene, onPreview, onFlagOutdated, selectable, selected, onSelect }: SceneCardProps) => {
  const colorClass = FEATURE_COLORS[scene.feature_area] || 'bg-muted text-muted-foreground';
  const isOutdated = scene.status === 'outdated';

  return (
    <Card
      className={cn(
        'p-4 transition-all hover:shadow-md cursor-pointer relative group',
        selected && 'ring-2 ring-primary',
        isOutdated && 'border-destructive/50'
      )}
      onClick={() => selectable && onSelect?.(scene)}
    >
      {isOutdated && (
        <div className="absolute top-2 right-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
      )}

      {/* Thumbnail placeholder */}
      <div className="aspect-video bg-muted rounded-md mb-3 flex items-center justify-center overflow-hidden">
        <div className="text-xs text-muted-foreground font-mono">{scene.scene_key}</div>
      </div>

      <h4 className="font-semibold text-sm truncate">{scene.title}</h4>
      {scene.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{scene.description}</p>
      )}

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <Badge variant="outline" className={cn('text-xs', colorClass)}>
          {scene.feature_area}
        </Badge>
        <Badge variant="secondary" className="text-xs gap-1">
          <Clock className="h-3 w-3" />
          {scene.duration_variant}
        </Badge>
        {isOutdated && (
          <Badge variant="destructive" className="text-xs">Outdated</Badge>
        )}
      </div>

      {!selectable && (
        <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {onPreview && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); onPreview(scene); }}>
              <Eye className="h-3 w-3" /> Preview
            </Button>
          )}
          {onFlagOutdated && scene.status === 'active' && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={(e) => { e.stopPropagation(); onFlagOutdated(scene); }}>
              <Flag className="h-3 w-3" /> Flag
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};
