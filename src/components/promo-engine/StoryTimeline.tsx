import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, X, Clock, ArrowRight } from 'lucide-react';
import type { SceneSequenceItem } from '@/hooks/usePromoEngine';
import { getDurationForVariant } from '@/hooks/usePromoEngine';
import { cn } from '@/lib/utils';

const STORY_LABELS = ['Hook', 'Problem', 'Solution', 'Proof', 'CTA'];

interface StoryTimelineProps {
  sequence: SceneSequenceItem[];
  onRemove: (index: number) => void;
  onReorder?: (from: number, to: number) => void;
}

export const StoryTimeline = ({ sequence, onRemove }: StoryTimelineProps) => {
  const totalDuration = sequence.reduce((sum, item) => sum + getDurationForVariant(item.duration_variant), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Timeline</p>
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          {totalDuration}s total
        </Badge>
      </div>

      <div className="space-y-2">
        {sequence.map((item, index) => (
          <div key={`${item.scene_id}-${index}`} className="flex items-center gap-2">
            {/* Connector */}
            {index > 0 && (
              <div className="absolute -mt-6 ml-[18px]">
                <div className="h-3 w-px bg-border" />
              </div>
            )}

            <Card className="flex-1 p-3 flex items-center gap-3 group">
              <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab shrink-0" />

              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {STORY_LABELS[index] || `Scene ${index + 1}`}
                </Badge>
                <span className="text-sm font-medium truncate">{item.title}</span>
                <Badge variant="outline" className="text-[10px] shrink-0 gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {item.duration_variant}
                </Badge>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={() => onRemove(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Card>

            {index < sequence.length - 1 && (
              <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
            )}
          </div>
        ))}

        {sequence.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg border-dashed">
            No scenes added yet. Select an audience and goal to auto-populate.
          </div>
        )}
      </div>
    </div>
  );
};
