import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  sportPreference: 'baseball' | 'softball' | null;
}

interface PlayerSearchFiltersProps {
  filters: FilterState;
  sportFilter: 'all' | 'baseball' | 'softball';
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}

const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
const THROWING_HANDS = ["R", "L", "B"];
const BATTING_SIDES = ["R", "L", "B"];

export function PlayerSearchFilters({ filters, sportFilter, onFilterChange, onClearFilters }: PlayerSearchFiltersProps) {
  const { t } = useTranslation();
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
    if (filters.sportPreference !== null) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  const getHandLabel = (hand: string) => {
    switch (hand) {
      case 'R': return t('playerFilters.right');
      case 'L': return t('playerFilters.left');
      case 'B': return t('playerFilters.both');
      default: return hand;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            {t('playerFilters.advancedFilters')}
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
            {t('playerFilters.clearAll')}
          </Button>
        )}
      </div>

      <CollapsibleContent className="mt-4">
        <div className="space-y-6 rounded-lg border border-border bg-card p-4">
          {/* Sport Preference */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">{t('playerFilters.sport')}</Label>
            <Select
              value={filters.sportPreference || ""}
              onValueChange={(value) =>
                onFilterChange({
                  ...filters,
                  sportPreference: value === "" ? null : value as 'baseball' | 'softball',
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('playerFilters.any')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baseball">{t('dashboard.baseball')}</SelectItem>
                <SelectItem value="softball">{t('dashboard.softball')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Position */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">{t('playerFilters.primaryPosition')}</Label>
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
            <Label className="text-sm font-semibold mb-2 block">{t('playerFilters.throwingHand')}</Label>
            <div className="flex gap-4">
              {THROWING_HANDS.map((hand) => (
                <div key={hand} className="flex items-center space-x-2">
                  <Checkbox
                    id={`throw-${hand}`}
                    checked={filters.throwingHands.includes(hand)}
                    onCheckedChange={() => handleThrowingHandToggle(hand)}
                  />
                  <label htmlFor={`throw-${hand}`} className="text-sm cursor-pointer">
                    {getHandLabel(hand)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Batting Side */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">{t('playerFilters.battingSide')}</Label>
            <div className="flex gap-4">
              {BATTING_SIDES.map((side) => (
                <div key={side} className="flex items-center space-x-2">
                  <Checkbox
                    id={`bat-${side}`}
                    checked={filters.battingSides.includes(side)}
                    onCheckedChange={() => handleBattingSideToggle(side)}
                  />
                  <label htmlFor={`bat-${side}`} className="text-sm cursor-pointer">
                    {getHandLabel(side)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Height Range */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">{t('playerFilters.heightRange')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder={t('playerFilters.placeholders.minHeight')}
                value={filters.heightMin}
                onChange={(e) => onFilterChange({ ...filters, heightMin: e.target.value })}
              />
              <Input
                placeholder={t('playerFilters.placeholders.maxHeight')}
                value={filters.heightMax}
                onChange={(e) => onFilterChange({ ...filters, heightMax: e.target.value })}
              />
            </div>
          </div>

          {/* Weight Range */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">{t('playerFilters.weightRange')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder={t('playerFilters.placeholders.minWeight')}
                value={filters.weightMin}
                onChange={(e) => onFilterChange({ ...filters, weightMin: e.target.value })}
              />
              <Input
                type="number"
                placeholder={t('playerFilters.placeholders.maxWeight')}
                value={filters.weightMax}
                onChange={(e) => onFilterChange({ ...filters, weightMax: e.target.value })}
              />
            </div>
          </div>

          {/* State */}
          <div>
            <Label htmlFor="state" className="text-sm font-semibold mb-2 block">{t('playerFilters.state')}</Label>
            <Input
              id="state"
              placeholder={t('playerFilters.placeholders.state')}
              value={filters.state}
              onChange={(e) => onFilterChange({ ...filters, state: e.target.value })}
            />
          </div>

          {/* Commitment Status */}
          <div>
            <Label htmlFor="commitment" className="text-sm font-semibold mb-2 block">{t('playerFilters.commitmentStatus')}</Label>
            <Select
              value={filters.commitmentStatus}
              onValueChange={(value) => onFilterChange({ ...filters, commitmentStatus: value })}
            >
              <SelectTrigger id="commitment">
                <SelectValue placeholder={t('playerFilters.any')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="committed">{t('playerFilters.committed')}</SelectItem>
                <SelectItem value="uncommitted">{t('playerFilters.uncommitted')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* HS Graduation Year */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">{t('playerFilters.hsGradYear')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder={t('playerFilters.placeholders.minYear')}
                value={filters.hsGradYearMin}
                onChange={(e) => onFilterChange({ ...filters, hsGradYearMin: e.target.value })}
              />
              <Input
                type="number"
                placeholder={t('playerFilters.placeholders.maxYear')}
                value={filters.hsGradYearMax}
                onChange={(e) => onFilterChange({ ...filters, hsGradYearMax: e.target.value })}
              />
            </div>
          </div>

          {/* College Graduation Year */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">{t('playerFilters.collegeGradYear')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder={t('playerFilters.placeholders.minYear')}
                value={filters.collegeGradYearMin}
                onChange={(e) => onFilterChange({ ...filters, collegeGradYearMin: e.target.value })}
              />
              <Input
                type="number"
                placeholder={t('playerFilters.placeholders.maxYear')}
                value={filters.collegeGradYearMax}
                onChange={(e) => onFilterChange({ ...filters, collegeGradYearMax: e.target.value })}
              />
            </div>
          </div>

          {/* Enrolled in College */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">{t('playerFilters.collegeStatus')}</Label>
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
                <SelectValue placeholder={t('playerFilters.any')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t('playerFilters.enrolledInCollege')}</SelectItem>
                <SelectItem value="false">{t('playerFilters.notInCollege')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Professional Status */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">{t('playerFilters.professionalStatus')}</Label>
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
                <SelectValue placeholder={t('playerFilters.any')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t('playerFilters.professional')}</SelectItem>
                <SelectItem value="false">{t('playerFilters.nonProfessional')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Free Agent */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">{t('playerFilters.freeAgentStatus')}</Label>
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
                <SelectValue placeholder={t('playerFilters.any')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t('playerFilters.freeAgent')}</SelectItem>
                <SelectItem value="false">{t('playerFilters.notFreeAgent')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* MLB/Professional Affiliate */}
          <div>
            <Label htmlFor="mlb-affiliate" className="text-sm font-semibold mb-2 block">
              {sportFilter === 'softball' ? t('playerFilters.professionalAffiliate') : t('playerFilters.mlbAffiliate')}
            </Label>
            <Input
              id="mlb-affiliate"
              placeholder={sportFilter === 'softball' ? t('playerFilters.placeholders.softballAffiliate') : t('playerFilters.placeholders.mlbAffiliate')}
              value={filters.mlbAffiliate}
              onChange={(e) => onFilterChange({ ...filters, mlbAffiliate: e.target.value })}
            />
          </div>

          {/* Independent League */}
          <div>
            <Label htmlFor="independent-league" className="text-sm font-semibold mb-2 block">{t('playerFilters.independentLeague')}</Label>
            <Input
              id="independent-league"
              placeholder={t('playerFilters.placeholders.independentLeague')}
              value={filters.independentLeague}
              onChange={(e) => onFilterChange({ ...filters, independentLeague: e.target.value })}
            />
          </div>

          {/* Foreign Player */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">{t('playerFilters.internationalPlayer')}</Label>
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
                <SelectValue placeholder={t('playerFilters.any')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t('playerFilters.international')}</SelectItem>
                <SelectItem value="false">{t('playerFilters.domestic')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}