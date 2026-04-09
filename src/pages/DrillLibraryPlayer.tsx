import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Star, Search } from 'lucide-react';
import { BaseballGloveIcon } from '@/components/icons/BaseballGloveIcon';
import { usePlayerDrillLibrary, type SortOption, type LibraryDrill } from '@/hooks/usePlayerDrillLibrary';
import { DrillDetailDialog } from '@/components/practice/DrillDetailDialog';
import { getProgressionLabel } from '@/utils/progressionMapping';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

function DrillCard({ drill, onClick }: { drill: LibraryDrill; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col rounded-xl border border-border bg-card text-left transition-all hover:shadow-lg hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring overflow-hidden"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {drill.video_url ? (
          <video src={drill.video_url} preload="metadata" className="w-full h-full object-cover" muted />
        ) : (
          <Play className="h-8 w-8 text-muted-foreground" />
        )}
        {drill.isRecommended && (
          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] gap-1">
            <Star className="h-3 w-3" /> Recommended
          </Badge>
        )}
        <Badge variant="outline" className="absolute top-2 right-2 bg-background/80 text-[10px]">
          {getProgressionLabel(drill.progression_level)}
        </Badge>
      </div>

      {/* Body */}
      <div className="flex-1 p-3 space-y-2">
        <h3 className="font-semibold text-sm text-foreground line-clamp-1">{drill.name}</h3>

        {drill.ai_context && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {drill.ai_context.length > 80 ? drill.ai_context.slice(0, 80) + '…' : drill.ai_context}
          </p>
        )}

        {/* Position tags */}
        {drill.positions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {drill.positions.slice(0, 4).map(pos => (
              <Badge key={pos} variant="secondary" className="text-[10px] capitalize px-1.5 py-0">
                {pos.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

export default function DrillLibraryPlayer() {
  const {
    drills, loading, playerContext,
    search, setSearch,
    sort, setSort,
    positionFilter, setPositionFilter,
    availablePositions,
  } = usePlayerDrillLibrary();

  const { modules } = useSubscription();
  const userHasPremium = modules.length > 0;

  const [selectedDrill, setSelectedDrill] = useState<LibraryDrill | null>(null);

  return (
    <DashboardLayout>
      <SubscriptionGate requiredAccess="any" featureName="Drill Library" featureDescription="Browse defensive drills tailored to your position and skill level.">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <BaseballGloveIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Drill Library</h1>
          </div>

          {/* Filters bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search drills..."
                className="pl-9"
              />
            </div>
            <Select value={sort} onValueChange={v => setSort(v as SortOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="level">By Level</SelectItem>
                <SelectItem value="recent">Recently Added</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Position chips */}
          {availablePositions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={!positionFilter ? 'default' : 'outline'}
                onClick={() => setPositionFilter(null)}
                className="h-7 text-xs"
              >
                All Positions
              </Button>
              {availablePositions.map(pos => (
                <Button
                  key={pos}
                  size="sm"
                  variant={positionFilter === pos ? 'default' : 'outline'}
                  onClick={() => setPositionFilter(positionFilter === pos ? null : pos)}
                  className="h-7 text-xs capitalize"
                >
                  {pos.replace(/_/g, ' ')}
                </Button>
              ))}
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : drills.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BaseballGloveIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No drills found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {drills.map(drill => (
                <DrillCard key={drill.id} drill={drill} onClick={() => setSelectedDrill(drill)} />
              ))}
            </div>
          )}
        </div>

        {/* Detail dialog */}
        <DrillDetailDialog
          open={!!selectedDrill}
          onOpenChange={open => !open && setSelectedDrill(null)}
          scoredDrill={selectedDrill ? {
            drill: {
              ...selectedDrill,
              tags: selectedDrill.tags,
              positions: selectedDrill.positions,
              difficulty_levels: selectedDrill.difficulty_levels || [],
              skill_target: null,
              is_active: true,
            },
            score: 0,
            locked: !userHasPremium,
            matchReasons: selectedDrill.matchReasons,
            breakdown: { skillMatch: 0, tagRelevance: 0, difficultyFit: 0, variety: 0, positionMatch: 0, errorTypeMatch: 0, weightBonus: 0, trendBonus: 0, progressionFit: 0, penalty: 0 },
          } : null}
        />
      </SubscriptionGate>
    </DashboardLayout>
  );
}
