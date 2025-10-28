import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface RankingsFiltersProps {
  selectedSport: string;
  selectedModule: string;
  onSportChange: (sport: string) => void;
  onModuleChange: (module: string) => void;
}

export function RankingsFilters({
  selectedSport,
  selectedModule,
  onSportChange,
  onModuleChange,
}: RankingsFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="sport-filter">Sport</Label>
        <Select value={selectedSport} onValueChange={onSportChange}>
          <SelectTrigger id="sport-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sports</SelectItem>
            <SelectItem value="baseball">Baseball</SelectItem>
            <SelectItem value="softball">Softball</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="module-filter">Module</Label>
        <Select value={selectedModule} onValueChange={onModuleChange}>
          <SelectTrigger id="module-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            <SelectItem value="hitting">Hitting</SelectItem>
            <SelectItem value="pitching">Pitching</SelectItem>
            <SelectItem value="throwing">Throwing</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
