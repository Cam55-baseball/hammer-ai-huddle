import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, Play, Star, Shield, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDrillRecommendations } from '@/hooks/useDrillRecommendations';
import { DrillDetailDialog } from './DrillDetailDialog';
import type { ScoredDrill } from '@/utils/drillRecommendationEngine';

interface FixYourGameProps {
  sport: string;
  detectedIssues?: string[];
  position?: string;
  onDone?: () => void;
}

export function FixYourGame({ sport, detectedIssues = [], position, onDone }: FixYourGameProps) {
  const { recommendations, isLoading } = useDrillRecommendations({
    sport,
    detectedIssues,
    position,
    enabled: true,
  });

  const [selectedDrill, setSelectedDrill] = useState<ScoredDrill | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <div className="animate-pulse">Analyzing your session...</div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations || recommendations.recommended.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-3">
          <Shield className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No drill recommendations available yet.</p>
          {onDone && (
            <Button onClick={onDone} variant="outline">Continue</Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Fix Your Game
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Detected Issues */}
          {detectedIssues.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Top Issues Detected</h4>
              <div className="flex flex-wrap gap-2">
                {detectedIssues.map((issue) => (
                  <Badge key={issue} variant="destructive" className="text-xs">
                    {issue.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Drills */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">
              Recommended Defensive Drills
              {recommendations.fallbackUsed && (
                <span className="text-xs text-muted-foreground ml-2">(general recommendations)</span>
              )}
            </h4>
            <div className="space-y-2">
              {recommendations.recommended.slice(0, 5).map((scored) => (
                <button
                  key={scored.drill.id}
                  onClick={() => setSelectedDrill(scored)}
                  className="w-full text-left rounded-lg border bg-card hover:bg-accent/50 transition-colors p-3"
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail area */}
                    <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center shrink-0">
                      {scored.locked ? (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Play className="h-5 w-5 text-primary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{scored.drill.name}</span>
                        {scored.locked && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            <Lock className="h-3 w-3 mr-1" />
                            Premium
                          </Badge>
                        )}
                      </div>

                      {/* Match reasons */}
                      {scored.matchReasons.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {scored.matchReasons.slice(0, 2).join(' · ')}
                        </p>
                      )}

                      {/* Tags row */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {scored.drill.positions?.slice(0, 2).map((p) => (
                          <Badge key={p} variant="secondary" className="text-[10px] capitalize px-1.5 py-0">
                            {p.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                        {scored.drill.difficulty_levels.slice(0, 1).map((d) => (
                          <Badge key={d} variant="outline" className="text-[10px] capitalize px-1.5 py-0">
                            {d}
                          </Badge>
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          Score: {scored.score}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {onDone && (
        <Button onClick={onDone} className="w-full gap-2">
          <ArrowRight className="h-4 w-4" />
          Done
        </Button>
      )}

      <DrillDetailDialog
        open={!!selectedDrill}
        onOpenChange={(open) => !open && setSelectedDrill(null)}
        scoredDrill={selectedDrill}
      />
    </div>
  );
}
