import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface RankingsFiltersProps {
  selectedSegment: string;
  onSegmentChange: (segment: string) => void;
}

export function RankingsFilters({
  selectedSegment,
  onSegmentChange,
}: RankingsFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="segment-filter">{t("rankings.segment")}</Label>
        <Select value={selectedSegment} onValueChange={onSegmentChange}>
          <SelectTrigger id="segment-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("rankings.allSegments")}</SelectItem>
            <SelectItem value="youth">{t("rankings.youth")}</SelectItem>
            <SelectItem value="hs">{t("rankings.highSchool")}</SelectItem>
            <SelectItem value="college">{t("rankings.college")}</SelectItem>
            <SelectItem value="pro">{t("rankings.pro")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
