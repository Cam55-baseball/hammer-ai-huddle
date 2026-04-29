import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useHIETeamSnapshot } from '@/hooks/useHIETeamSnapshot';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Target, Sparkles, Loader2, Clock, Dumbbell } from 'lucide-react';

interface DrillBlock {
  name: string;
  duration_minutes: number;
  focus: string;
  description: string;
  intensity: string;
  player_count?: string;
  equipment?: string;
}

export function TeamWeaknessEngine() {
  const { playerSnapshots, teamSnapshot } = useHIETeamSnapshot();
  const { session } = useAuth();
  const [drillBlocks, setDrillBlocks] = useState<DrillBlock[]>(
    (teamSnapshot?.suggested_team_drills as DrillBlock[]) ?? []
  );
  const [generating, setGenerating] = useState(false);

  if (playerSnapshots.length === 0) return null;

  // Aggregate weakness areas across all players
  const areaCounts: Record<string, { count: number; issue: string }> = {};
  playerSnapshots.forEach(p => {
    p.weakness_clusters.forEach(w => {
      if (!areaCounts[w.area]) areaCounts[w.area] = { count: 0, issue: w.issue };
      areaCounts[w.area].count++;
    });
  });

  const sorted = Object.entries(areaCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5);

  if (sorted.length === 0) return null;

  const total = playerSnapshots.length;

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      const weaknessPatterns = sorted.map(([area, { count, issue }]) => ({
        area,
        issue,
        count,
        pct: Math.round((count / total) * 100),
      }));

      const { data, error } = await supabase.functions.invoke('hie-team-plan', {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        body: { weakness_patterns: weaknessPatterns, team_size: total, sport: 'baseball' },
      });

      if (error) throw error;
      const blocks = data?.drill_blocks ?? [];
      setDrillBlocks(blocks);
    } catch (err) {
      console.error('Failed to generate team plan:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Team Weakness Patterns
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGeneratePlan}
            disabled={generating}
            className="gap-1"
          >
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {generating ? 'Generating...' : 'Generate Team Plan'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map(([area, { count, issue }]) => {
          const pct = Math.round((count / total) * 100);
          return (
            <div key={area} className="border rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">{issue}</span>
                <Badge variant="secondary">{pct}% of team</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {count} of {total} players affected
              </p>
            </div>
          );
        })}

        {drillBlocks.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-sm font-semibold flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              Hammer Team Practice Plan
            </div>
            {drillBlocks.map((block, i) => (
              <div key={i} className="border rounded-lg p-3 bg-accent/30">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{block.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {block.duration_minutes}m
                    </Badge>
                    <Badge variant="secondary" className="text-xs">{block.intensity}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{block.description}</p>
                <p className="text-xs text-primary mt-1">Focus: {block.focus}</p>
                {block.equipment && (
                  <p className="text-xs text-muted-foreground">Equipment: {block.equipment}</p>
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground italic">Suggested — Not Mandatory</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
