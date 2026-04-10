import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Lock, Play, Target, ListOrdered, MessageCircle, AlertTriangle, TrendingUp, Wrench } from 'lucide-react';
import type { ScoredDrill } from '@/utils/drillRecommendationEngine';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DrillInstructions {
  purpose?: string;
  setup?: string;
  execution?: string[];
  coaching_cues?: string[];
  mistakes?: string[];
  progression?: string[];
}

interface DrillDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scoredDrill: ScoredDrill | null;
}

export function DrillDetailDialog({ open, onOpenChange, scoredDrill }: DrillDetailDialogProps) {
  const { user } = useAuth();

  if (!scoredDrill) return null;
  const { drill, locked, matchReasons } = scoredDrill;

  const hasVideo = drill.video_url && drill.video_url.trim() !== '';
  const rawInstructions: DrillInstructions | null =
    (drill as any).instructions && typeof (drill as any).instructions === 'object' && !Array.isArray((drill as any).instructions)
      ? (drill as any).instructions
      : null;

  // Only use real structured instructions — no fake fallbacks
  const instructions: DrillInstructions | null = rawInstructions;

  const handleSaveToVault = async () => {
    if (!user?.id) return;
    const { error } = await supabase.from('vault_saved_drills').insert({
      user_id: user.id,
      drill_name: drill.name,
      drill_description: drill.ai_context || null,
      module_origin: drill.module,
      sport: drill.sport,
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
          ) : hasVideo ? (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <video
                src={drill.video_url!}
                controls
                className="w-full h-full object-contain"
                onPlay={handleTrackUsage}
              />
            </div>
          ) : null}

          {/* Description */}
          {drill.description && (
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Description</h4>
              <p className="text-sm text-muted-foreground">{drill.description}</p>
            </div>
          )}

          {/* Structured Instructions */}
          {instructions && (
            <div className="space-y-3 border-t border-border pt-3">
              {instructions.purpose && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Target className="h-4 w-4" /> Purpose
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{instructions.purpose}</p>
                </div>
              )}

              {instructions.setup && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Wrench className="h-4 w-4" /> Setup
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{instructions.setup}</p>
                </div>
              )}

              {instructions.execution && instructions.execution.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <ListOrdered className="h-4 w-4" /> Execution
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    {instructions.execution.map((step, i) => (
                      <li key={i} className="leading-relaxed">{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {instructions.coaching_cues && instructions.coaching_cues.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" /> Coaching Cues
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {instructions.coaching_cues.map((cue, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary mt-1.5 shrink-0">•</span>
                        <span className="italic">"{cue}"</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {instructions.mistakes && instructions.mistakes.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Common Mistakes
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {instructions.mistakes.map((mistake, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-destructive mt-1.5 shrink-0">✕</span>
                        {mistake}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {instructions.progression && instructions.progression.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Progression
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {instructions.progression.map((prog, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary mt-1.5 shrink-0">→</span>
                        {prog}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
