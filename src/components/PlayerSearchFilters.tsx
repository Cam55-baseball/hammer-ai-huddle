import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, X } from "lucide-react";

interface FilterState {
  positions: string[];
  throwingHands: string[];
  battingSides: string[];
  heightMin: string;
  heightMax: string;
  weightMin: string;
  weightMax: string;
  state: string;
  commitmentStatus: string;
  hsGradYearMin: string;
  hsGradYearMax: string;
  collegeGradYearMin: string;
  collegeGradYearMax: string;
  enrolledInCollege: boolean | null;
  isProfessional: boolean | null;
  isFreeAgent: boolean | null;
  mlbAffiliate: string;
  independentLeague: string;
  isForeignPlayer: boolean | null;
}

interface PlayerSearchFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}

const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
const THROWING_HANDS = ["R", "L", "B"];
const BATTING_SIDES = ["R", "L", "B"];

export function PlayerSearchFilters({ filters, onFilterChange, onClearFilters }: PlayerSearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePositionToggle = (position: string) => {
    const newPositions = filters.positions.includes(position)
      ? filters.positions.filter((p) => p !== position)
      : [...filters.positions, position];
    onFilterChange({ ...filters, positions: newPositions });
  };

  const handleThrowingHandToggle = (hand: string) => {
    const newHands = filters.throwingHands.includes(hand)
      ? filters.throwingHands.filter((h) => h !== hand)
      : [...filters.throwingHands, hand];
    onFilterChange({ ...filters, throwingHands: newHands });
  };

  const handleBattingSideToggle = (side: string) => {
    const newSides = filters.battingSides.includes(side)
      ? filters.battingSides.filter((s) => s !== side)
      : [...filters.battingSides, side];
    onFilterChange({ ...filters, battingSides: newSides });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.positions.length > 0) count++;
    if (filters.throwingHands.length > 0) count++;
    if (filters.battingSides.length > 0) count++;
    if (filters.heightMin || filters.heightMax) count++;
    if (filters.weightMin || filters.weightMax) count++;
    if (filters.state) count++;
    if (filters.commitmentStatus) count++;
    if (filters.hsGradYearMin || filters.hsGradYearMax) count++;
    if (filters.collegeGradYearMin || filters.collegeGradYearMax) count++;
    if (filters.enrolledInCollege !== null) count++;
    if (filters.isProfessional !== null) count++;
    if (filters.isFreeAgent !== null) count++;
    if (filters.mlbAffiliate) count++;
    if (filters.independentLeague) count++;
    if (filters.isForeignPlayer !== null) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            Advanced Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <CollapsibleContent className="mt-4">
        <div className="space-y-6 rounded-lg border border-border bg-card p-4">
          {/* Position */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Primary Position</Label>
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map((position) => (
                <div key={position} className="flex items-center space-x-2">
                  <Checkbox
                    id={`pos-${position}`}
                    checked={filters.positions.includes(position)}
                    onCheckedChange={() => handlePositionToggle(position)}
                  />
                  <label htmlFor={`pos-${position}`} className="text-sm cursor-pointer">
                    {position}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Throwing Hand */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Throwing Hand</Label>
            <div className="flex gap-4">
              {THROWING_HANDS.map((hand) => (
                <div key={hand} className="flex items-center space-x-2">
                  <Checkbox
                    id={`throw-${hand}`}
                    checked={filters.throwingHands.includes(hand)}
                    onCheckedChange={() => handleThrowingHandToggle(hand)}
                  />
                  <label htmlFor={`throw-${hand}`} className="text-sm cursor-pointer">
                    {hand === "B" ? "Both" : hand === "R" ? "Right" : "Left"}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Batting Side */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Batting Side</Label>
            <div className="flex gap-4">
              {BATTING_SIDES.map((side) => (
                <div key={side} className="flex items-center space-x-2">
                  <Checkbox
                    id={`bat-${side}`}
                    checked={filters.battingSides.includes(side)}
                    onCheckedChange={() => handleBattingSideToggle(side)}
                  />
                  <label htmlFor={`bat-${side}`} className="text-sm cursor-pointer">
                    {side === "B" ? "Both" : side === "R" ? "Right" : "Left"}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Height Range */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Height Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Min (e.g., 5'8&quot;)"
                value={filters.heightMin}
                onChange={(e) => onFilterChange({ ...filters, heightMin: e.target.value })}
              />
              <Input
                placeholder="Max (e.g., 6'5&quot;)"
                value={filters.heightMax}
                onChange={(e) => onFilterChange({ ...filters, heightMax: e.target.value })}
              />
            </div>
          </div>

          {/* Weight Range */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Weight Range (lbs)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min (e.g., 150)"
                value={filters.weightMin}
                onChange={(e) => onFilterChange({ ...filters, weightMin: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Max (e.g., 220)"
                value={filters.weightMax}
                onChange={(e) => onFilterChange({ ...filters, weightMax: e.target.value })}
              />
            </div>
          </div>

          {/* State */}
          <div>
            <Label htmlFor="state" className="text-sm font-semibold mb-2 block">State</Label>
            <Input
              id="state"
              placeholder="e.g., California"
              value={filters.state}
              onChange={(e) => onFilterChange({ ...filters, state: e.target.value })}
            />
          </div>

          {/* Commitment Status */}
          <div>
            <Label htmlFor="commitment" className="text-sm font-semibold mb-2 block">Commitment Status</Label>
            <Select
              value={filters.commitmentStatus}
              onValueChange={(value) => onFilterChange({ ...filters, commitmentStatus: value })}
            >
              <SelectTrigger id="commitment">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="committed">Committed</SelectItem>
                <SelectItem value="uncommitted">Uncommitted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* HS Graduation Year */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">High School Graduation Year</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min (e.g., 2024)"
                value={filters.hsGradYearMin}
                onChange={(e) => onFilterChange({ ...filters, hsGradYearMin: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Max (e.g., 2028)"
                value={filters.hsGradYearMax}
                onChange={(e) => onFilterChange({ ...filters, hsGradYearMax: e.target.value })}
              />
            </div>
          </div>

          {/* College Graduation Year */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">College Graduation Year</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min (e.g., 2024)"
                value={filters.collegeGradYearMin}
                onChange={(e) => onFilterChange({ ...filters, collegeGradYearMin: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Max (e.g., 2028)"
                value={filters.collegeGradYearMax}
                onChange={(e) => onFilterChange({ ...filters, collegeGradYearMax: e.target.value })}
              />
            </div>
          </div>

          {/* Enrolled in College */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">College Status</Label>
            <Select
              value={filters.enrolledInCollege === null ? "" : filters.enrolledInCollege ? "true" : "false"}
              onValueChange={(value) =>
                onFilterChange({
                  ...filters,
                  enrolledInCollege: value === "" ? null : value === "true",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Enrolled in College</SelectItem>
                <SelectItem value="false">Not in College</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Professional Status */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Professional Status</Label>
            <Select
              value={filters.isProfessional === null ? "" : filters.isProfessional ? "true" : "false"}
              onValueChange={(value) =>
                onFilterChange({
                  ...filters,
                  isProfessional: value === "" ? null : value === "true",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Professional</SelectItem>
                <SelectItem value="false">Non-Professional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Free Agent */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Free Agent Status</Label>
            <Select
              value={filters.isFreeAgent === null ? "" : filters.isFreeAgent ? "true" : "false"}
              onValueChange={(value) =>
                onFilterChange({
                  ...filters,
                  isFreeAgent: value === "" ? null : value === "true",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Free Agent</SelectItem>
                <SelectItem value="false">Not Free Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* MLB Affiliate */}
          <div>
            <Label htmlFor="mlb-affiliate" className="text-sm font-semibold mb-2 block">MLB Affiliate</Label>
            <Input
              id="mlb-affiliate"
              placeholder="e.g., Yankees, Dodgers"
              value={filters.mlbAffiliate}
              onChange={(e) => onFilterChange({ ...filters, mlbAffiliate: e.target.value })}
            />
          </div>

          {/* Independent League */}
          <div>
            <Label htmlFor="independent-league" className="text-sm font-semibold mb-2 block">Independent League</Label>
            <Input
              id="independent-league"
              placeholder="e.g., Atlantic League"
              value={filters.independentLeague}
              onChange={(e) => onFilterChange({ ...filters, independentLeague: e.target.value })}
            />
          </div>

          {/* Foreign Player */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">International Player</Label>
            <Select
              value={filters.isForeignPlayer === null ? "" : filters.isForeignPlayer ? "true" : "false"}
              onValueChange={(value) =>
                onFilterChange({
                  ...filters,
                  isForeignPlayer: value === "" ? null : value === "true",
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">International</SelectItem>
                <SelectItem value="false">Domestic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
