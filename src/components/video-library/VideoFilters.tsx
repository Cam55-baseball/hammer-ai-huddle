import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { LibraryTag } from "@/hooks/useVideoLibrary";

interface VideoFiltersProps {
  tags: LibraryTag[];
  sportFilter: string[];
  categoryFilter: string;
  tagFilters: string[];
  onSportChange: (sport: string[]) => void;
  onCategoryChange: (cat: string) => void;
  onTagToggle: (tag: string) => void;
  onClearAll: () => void;
}

const SPORT_OPTIONS = ['baseball', 'softball', 'both'];
const CATEGORY_OPTIONS = [
  'hitting', 'pitching', 'fielding', 'catching', 'baserunning',
  'throwing', 'strength', 'mobility', 'recovery', 'mental game',
  'game iq', 'practice design', 'coaching concepts'
];

export function VideoFilters({
  tags, sportFilter, categoryFilter, tagFilters,
  onSportChange, onCategoryChange, onTagToggle, onClearAll
}: VideoFiltersProps) {
  const hasFilters = sportFilter.length > 0 || categoryFilter || tagFilters.length > 0;

  // Get relevant tags based on selected category
  const relevantTags = categoryFilter
    ? tags.filter(t => t.parent_category === categoryFilter || t.category === 'topic')
    : tags.filter(t => t.category === 'category' || t.category === 'position');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select
          value={sportFilter[0] || 'all'}
          onValueChange={(v) => onSportChange(v === 'all' ? [] : [v])}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Sport" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>
            {SPORT_OPTIONS.map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter || 'all'} onValueChange={(v) => onCategoryChange(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORY_OPTIONS.map(c => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClearAll} className="h-9 text-xs gap-1">
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      {relevantTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {relevantTags.slice(0, 30).map(tag => (
            <Badge
              key={tag.id}
              variant={tagFilters.includes(tag.name) ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => onTagToggle(tag.name)}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      )}

      {tagFilters.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tagFilters.map(t => (
            <Badge key={t} variant="default" className="text-xs gap-1">
              {t}
              <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => onTagToggle(t)} />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
