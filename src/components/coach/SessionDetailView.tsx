import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ShieldCheck, Save, Star } from 'lucide-react';
import { format } from 'date-fns';

interface SessionDetailViewProps {
  session: {
    id: string;
    user_id: string;
    coach_id: string | null;
    player_name: string;
    module: string;
    session_type: string;
    session_date: string;
    season_context: string;
    coach_override_applied: boolean;
    drill_blocks: any;
    fatigue_state_at_session: any;
    micro_layer_data: any;
  };
  onBack: () => void;
}

export function SessionDetailView({ session, onBack }: SessionDetailViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [overrideGrade, setOverrideGrade] = useState(50);
  const [overrideReason, setOverrideReason] = useState('');

  const fatigue = session.fatigue_state_at_session as any;
  const reps = Array.isArray(session.micro_layer_data) ? session.micro_layer_data : [];

  const submitOverride = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('coach_grade_overrides')
        .insert({
          coach_id: user!.id,
          session_id: session.id,
          override_grade: overrideGrade,
          override_reason: overrideReason || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-session-feed'] });
      toast({ title: 'Grade override submitted' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Feed
      </Button>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {session.player_name} — {session.module}
            {session.coach_override_applied && (
              <Badge variant="secondary" className="gap-0.5">
                <ShieldCheck className="h-3 w-3" /> Verified
              </Badge>
            )}
          </CardTitle>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
            <span>{format(new Date(session.session_date), 'MMM d, yyyy')}</span>
            <span>• {session.session_type}</span>
            <span>• {session.season_context}</span>
            {fatigue?.rep_source && <span>• {fatigue.rep_source}</span>}
            {fatigue?.pitch_distance_ft && <span>• {fatigue.pitch_distance_ft}ft</span>}
            {fatigue?.velocity_band && <span>• {fatigue.velocity_band}</span>}
            {fatigue?.environment && <span>• {fatigue.environment}</span>}
            {session.coach_id === user?.id && (
              <span className="text-primary font-medium">• You led this session</span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Rep list */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Reps ({reps.length})
            </Label>
            {reps.length === 0 ? (
              <p className="text-xs text-muted-foreground">No rep data available</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {reps.map((rep: any, i: number) => (
                  <div key={i} className="border rounded-md p-2 text-xs space-y-0.5">
                    <span className="font-medium">#{i + 1}</span>
                    {rep.execution_score && <span className="ml-1 text-muted-foreground">E{rep.execution_score}</span>}
                    {rep.contact_quality && <Badge variant="outline" className="text-[9px] ml-1">{rep.contact_quality}</Badge>}
                    {rep.pitch_result && <Badge variant="outline" className="text-[9px] ml-1">{rep.pitch_result}</Badge>}
                    {rep.depth_zone && <span className="block text-muted-foreground">Depth: {rep.depth_zone}</span>}
                    {rep.pitch_location && (
                      <span className="block text-muted-foreground">
                        Zone: R{rep.pitch_location.row}C{rep.pitch_location.col}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Override grade (if not already applied) */}
          {!session.coach_override_applied && (
            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-500" />
                Submit Grade Override (20-80)
              </Label>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Grade: {overrideGrade}
                </Label>
                <Slider
                  min={20} max={80} step={5}
                  value={[overrideGrade]}
                  onValueChange={([v]) => setOverrideGrade(v)}
                />
              </div>
              <Textarea
                placeholder="Reason / notes (optional)"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                className="text-sm h-20"
              />
              <Button
                onClick={() => submitOverride.mutate()}
                disabled={submitOverride.isPending}
                size="sm"
              >
                <Save className="h-4 w-4 mr-1" />
                Submit Override (Immutable)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
