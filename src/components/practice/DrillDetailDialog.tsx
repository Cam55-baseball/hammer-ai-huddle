import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Lock, Play, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScoredDrill } from '@/utils/drillRecommendationEngine';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DrillDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scoredDrill: ScoredDrill | null;
}

export function DrillDetailDialog({ open, onOpenChange, scoredDrill }: DrillDetailDialogProps) {
  const { user } = useAuth();

  if (!scoredDrill) return null;
  const { drill, locked, matchReasons, breakdown } = scoredDrill;

  const handleSaveToVault = async () => {
    if (!user?.id) return;
    const { error } = await supabase.from('vault_saved_drills').insert({
      user_id: user.id,
      drill_name: drill.name,
      module: drill.module,
      drill_type: drill.skill_target || drill.module,
      constraints: drill.ai_context ? { ai_context: drill.ai_context } : {},
    });
    if (error) {
      toast.error('Failed to save drill');
    } else {
      toast.success('Drill saved to vault!');
    }
  };

  const handleTrackUsage = async () => {
    if (!user?.id) return;
    await supabase.from('drill_usage_tracking').insert({
      user_id: user.id,
      drill_id: drill.id,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{drill.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video section */}
          {locked ? (
            <div className="relative aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="relative text-center space-y-2">
                <Lock className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground font-medium">Premium Content</p>
                <Button size="sm" variant="secondary">
                  Upgrade to Unlock
                </Button>
              </div>
            </div>
          ) : drill.video_url ? (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <video
                src={drill.video_url}
                controls
                className="w-full h-full object-contain"
                onPlay={handleTrackUsage}
              />
            </div>
          ) : (
            <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
              <Play className="h-8 w-8 text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">No video available</span>
            </div>
          )}

          {/* Description */}
          {drill.description && (
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Description</h4>
              <p className="text-sm text-muted-foreground">{drill.description}</p>
            </div>
          )}

          {/* Why this helps YOU */}
          {(drill.ai_context || matchReasons.length > 0) && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
              <h4 className="text-sm font-semibold text-primary">Why this helps you</h4>
              {matchReasons.length > 0 && (
                <ul className="text-sm text-muted-foreground space-y-1">
                  {matchReasons.map((reason, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
              {drill.ai_context && (
                <p className="text-sm text-muted-foreground italic">{drill.ai_context}</p>
              )}
            </div>
          )}

          {/* Tags */}
          {drill.tags.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Tags</h4>
              <div className="flex flex-wrap gap-1.5">
                {drill.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Positions */}
          {drill.positions && drill.positions.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Positions</h4>
              <div className="flex flex-wrap gap-1.5">
                {drill.positions.map((pos) => (
                  <Badge key={pos} variant="outline" className="text-xs capitalize">
                    {pos.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty */}
          {drill.difficulty_levels.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Difficulty</h4>
              <div className="flex flex-wrap gap-1.5">
                {drill.difficulty_levels.map((level) => (
                  <Badge key={level} variant="outline" className="text-xs capitalize">
                    {level}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {!locked && (
              <Button onClick={handleSaveToVault} variant="outline" className="flex-1 gap-2">
                <Star className="h-4 w-4" />
                Save to Vault
              </Button>
            )}
            <Button onClick={() => onOpenChange(false)} variant="secondary" className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
