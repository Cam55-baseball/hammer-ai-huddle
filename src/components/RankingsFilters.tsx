import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="sport-filter">{t('rankings.sport')}</Label>
        <Select value={selectedSport} onValueChange={onSportChange}>
          <SelectTrigger id="sport-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('rankings.allSports')}</SelectItem>
            <SelectItem value="baseball">{t('dashboard.baseball')}</SelectItem>
            <SelectItem value="softball">{t('dashboard.softball')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="module-filter">{t('rankings.module')}</Label>
        <Select value={selectedModule} onValueChange={onModuleChange}>
          <SelectTrigger id="module-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('rankings.allModules')}</SelectItem>
            <SelectItem value="hitting">{t('dashboard.hitting')}</SelectItem>
            <SelectItem value="pitching">{t('dashboard.pitching')}</SelectItem>
            <SelectItem value="throwing">{t('dashboard.throwing')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
