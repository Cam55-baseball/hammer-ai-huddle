import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Play, Star, Search, Shield, SlidersHorizontal, X } from 'lucide-react';

import { usePlayerDrillLibrary, type SortOption, type LibraryDrill } from '@/hooks/usePlayerDrillLibrary';
import { DrillDetailDialog } from '@/components/practice/DrillDetailDialog';
import { getDrillLevelLabel, LEVEL_LABELS, LEVEL_ORDER, type LevelKey } from '@/utils/drillLevelLabels';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import { positionLabel, positionShort, canonicalizePositions, normalizePositionCode } from '@/lib/drills/positionLabels';

function DrillCard({ drill, onClick }: { drill: LibraryDrill; onClick: () => void }) {
  const hasVideo = drill.video_url && drill.video_url.trim() !== '';

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col rounded-xl border border-border bg-card text-left transition-all hover:shadow-lg hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring overflow-hidden"
    >
      {/* Thumbnail — only if video exists */}
      {hasVideo && (
        <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
          <video src={drill.video_url!} preload="metadata" className="w-full h-full object-cover" muted />
        </div>
      )}

      {/* Body */}
      <div className="flex-1 p-3 space-y-2">
        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {drill.isRecommended && (
            <Badge className="bg-primary text-primary-foreground text-[10px] gap-1">
              <Star className="h-3 w-3" /> Recommended
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            {getDrillLevelLabel(drill.difficulty_levels)}
          </Badge>
        </div>

        <h3 className="font-semibold text-sm text-foreground line-clamp-1">{drill.name}</h3>

        {drill.ai_context && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {drill.ai_context.length > 80 ? drill.ai_context.slice(0, 80) + '…' : drill.ai_context}
          </p>
        )}

        {/* Position tags — deduped + canonicalized */}
        {drill.positions.length > 0 && (() => {
          const canon = canonicalizePositions(drill.positions);
          if (!canon.length) return null;
          return (
            <div className="flex flex-wrap gap-1">
              {canon.slice(0, 4).map(pos => (
                <Badge key={pos} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {pos}
                </Badge>
              ))}
            </div>
          );
        })()}
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
    selectedLevels, setSelectedLevels,
    availablePositions,
    availableLevels,
    clearFilters,
  } = usePlayerDrillLibrary();

  const { modules } = useSubscription();
  const userHasPremium = modules.length > 0;

  const [selectedDrill, setSelectedDrill] = useState<LibraryDrill | null>(null);

  const hasActiveFilters = !!search.trim() || !!positionFilter || selectedLevels.length > 0;

  const toggleLevel = (key: LevelKey) => {
    setSelectedLevels(
      selectedLevels.includes(key)
        ? selectedLevels.filter(k => k !== key)
        : [...selectedLevels, key]
    );
  };

  const levelTriggerLabel =
    selectedLevels.length === 0
      ? 'All Levels'
      : selectedLevels.length === 1
        ? LEVEL_LABELS[selectedLevels[0] as LevelKey] ?? 'Level'
        : `${selectedLevels.length} levels`;

  // Show all four levels in the picker so users can pre-select even if not
  // all are represented in the currently loaded drills.
  const levelOptions = LEVEL_ORDER.filter(
    k => availableLevels.length === 0 || availableLevels.includes(k)
  );

  return (
    <DashboardLayout>
      <SubscriptionGate requiredAccess="any" featureName="Defensive Drill Library" featureDescription="Browse defensive drills tailored to your position and skill level.">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Defensive Drill Library</h1>
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

            {/* Level multi-select */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-[180px] justify-between">
                  <span className="flex items-center gap-2 truncate">
                    <SlidersHorizontal className="h-4 w-4" />
                    {levelTriggerLabel}
                  </span>
                  {selectedLevels.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                      {selectedLevels.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="end">
                <div className="space-y-1">
                  {levelOptions.map(k => {
                    const checked = selectedLevels.includes(k);
                    return (
                      <label
                        key={k}
                        className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleLevel(k)}
                        />
                        <span className="flex-1">{LEVEL_LABELS[k]}</span>
                      </label>
                    );
                  })}
                  {selectedLevels.length > 0 && (
                    <>
                      <div className="my-1 h-px bg-border" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8"
                        onClick={() => setSelectedLevels([])}
                      >
                        <X className="h-3.5 w-3.5 mr-1.5" /> Clear levels
                      </Button>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Select value={sort} onValueChange={v => setSort(v as SortOption)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="level">By Level</SelectItem>
                <SelectItem value="recent">Recently Added</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Position chips — canonical codes only, scorecard order, no duplicates */}
          {availablePositions.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                size="sm"
                variant={!positionFilter ? 'default' : 'outline'}
                onClick={() => setPositionFilter(null)}
                className="h-7 text-xs"
              >
                All Positions
              </Button>
              {availablePositions.map(pos => {
                const active = normalizePositionCode(positionFilter) === pos;
                return (
                  <Button
                    key={pos}
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    onClick={() => setPositionFilter(active ? null : pos)}
                    className="h-7 text-xs"
                    title={positionLabel(pos)}
                  >
                    {positionShort(pos)}
                  </Button>
                );
              })}
              {hasActiveFilters && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearFilters}
                  className="h-7 text-xs ml-auto text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Clear all
                </Button>
              )}
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
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-40" />
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
              instructions: selectedDrill.instructions,
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
