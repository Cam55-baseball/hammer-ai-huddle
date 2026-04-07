import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dumbbell, Star, Sparkles, Trash2 } from 'lucide-react';
import { useDrillRecommendations } from '@/hooks/useDrillRecommendations';
import { DrillDetailDialog } from '@/components/practice/DrillDetailDialog';
import type { ScoredDrill } from '@/utils/drillRecommendationEngine';

interface VaultDrillWorkProps {
  savedDrills: any[];
  onDeleteDrill?: (id: string) => void;
  sport: string;
}

export function VaultDrillWork({ savedDrills, onDeleteDrill, sport }: VaultDrillWorkProps) {
  const [activeTab, setActiveTab] = useState('saved');
  const [selectedDrill, setSelectedDrill] = useState<ScoredDrill | null>(null);

  const { recommendations, isLoading } = useDrillRecommendations({
    sport,
    enabled: activeTab === 'recommended',
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Dumbbell className="h-5 w-5 text-primary" />
          My Drill Work
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="saved" className="gap-1.5 text-xs">
              <Star className="h-3.5 w-3.5" />
              Saved ({savedDrills.length})
            </TabsTrigger>
            <TabsTrigger value="recommended" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Recommended
            </TabsTrigger>
          </TabsList>

          <TabsContent value="saved" className="mt-3 space-y-2">
            {savedDrills.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No saved drills yet. Save drills from practice recommendations.
              </p>
            ) : (
              savedDrills.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{d.drill_name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {d.module}
                      </Badge>
                      {d.drill_type && (
                        <Badge variant="outline" className="text-[10px]">
                          {d.drill_type.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {onDeleteDrill && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={() => onDeleteDrill(d.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="recommended" className="mt-3 space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4 animate-pulse">
                Loading recommendations...
              </p>
            ) : !recommendations || recommendations.recommended.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Complete more sessions to get personalized recommendations.
              </p>
            ) : (
              recommendations.recommended.slice(0, 5).map((scored) => (
                <button
                  key={scored.drill.id}
                  onClick={() => setSelectedDrill(scored)}
                  className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{scored.drill.name}</p>
                      {scored.matchReasons.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {scored.matchReasons.slice(0, 2).join(' · ')}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 ml-2">
                      Score: {scored.score}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <DrillDetailDialog
        open={!!selectedDrill}
        onOpenChange={(open) => !open && setSelectedDrill(null)}
        scoredDrill={selectedDrill}
      />
    </Card>
  );
}
