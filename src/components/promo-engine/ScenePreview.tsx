import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Clock, Tag, Database, RefreshCw } from 'lucide-react';
import type { PromoScene } from '@/hooks/usePromoEngine';
import { useUpdateSceneStatus } from '@/hooks/usePromoEngine';

interface ScenePreviewProps {
  scene: PromoScene;
  onClose: () => void;
}

export const ScenePreview = ({ scene, onClose }: ScenePreviewProps) => {
  const updateStatus = useUpdateSceneStatus();

  const handleToggleStatus = () => {
    const newStatus = scene.status === 'outdated' ? 'active' : 'outdated';
    updateStatus.mutate({ id: scene.id, status: newStatus });
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold">{scene.title}</h3>
          <p className="text-sm text-muted-foreground">{scene.description}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Preview area */}
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border">
        <div className="text-center space-y-2">
          <p className="text-sm font-mono text-muted-foreground">{scene.scene_key}</p>
          <p className="text-xs text-muted-foreground">Remotion scene preview (render pipeline required)</p>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> Duration
          </div>
          <p className="text-sm font-medium">{scene.duration_variant}</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tag className="h-3 w-3" /> Feature Area
          </div>
          <p className="text-sm font-medium capitalize">{scene.feature_area}</p>
        </div>
      </div>

      {/* Tags */}
      {scene.tags?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Tags</p>
          <div className="flex flex-wrap gap-1">
            {scene.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Sim Data */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Database className="h-3 w-3" /> Simulation Data
        </div>
        <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40 font-mono">
          {JSON.stringify(scene.sim_data, null, 2)}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant={scene.status === 'outdated' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5"
          onClick={handleToggleStatus}
          disabled={updateStatus.isPending}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {scene.status === 'outdated' ? 'Mark Active' : 'Flag Outdated'}
        </Button>
      </div>
    </Card>
  );
};
