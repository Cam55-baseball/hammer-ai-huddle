import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { timeWindows, contextFilters, type TimeWindow, type ContextFilter } from '@/data/heatMapConfig';

interface HeatMapFilterBarProps {
  timeWindow: TimeWindow;
  contextFilter: ContextFilter;
  splitKey: string;
  onTimeWindowChange: (v: TimeWindow) => void;
  onContextFilterChange: (v: ContextFilter) => void;
  onSplitKeyChange: (v: string) => void;
}

const splitOptions = [
  { value: 'all', label: 'All' },
  { value: 'vs_lhp', label: 'vs LHP' },
  { value: 'vs_rhp', label: 'vs RHP' },
  { value: 'vs_lhb', label: 'vs LHB' },
  { value: 'vs_rhb', label: 'vs RHB' },
];

const timeLabels: Record<TimeWindow, string> = { '7d': '7D', '30d': '30D', season: 'Season', career: 'Career' };
const contextLabels: Record<ContextFilter, string> = { all: 'All', practice_only: 'Practice', game_only: 'Game' };

export function HeatMapFilterBar({ timeWindow, contextFilter, splitKey, onTimeWindowChange, onContextFilterChange, onSplitKeyChange }: HeatMapFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ToggleGroup type="single" value={timeWindow} onValueChange={(v) => v && onTimeWindowChange(v as TimeWindow)} size="sm" variant="outline">
        {timeWindows.map((tw) => (
          <ToggleGroupItem key={tw} value={tw} className="text-xs">{timeLabels[tw]}</ToggleGroupItem>
        ))}
      </ToggleGroup>

      <ToggleGroup type="single" value={contextFilter} onValueChange={(v) => v && onContextFilterChange(v as ContextFilter)} size="sm" variant="outline">
        {contextFilters.map((cf) => (
          <ToggleGroupItem key={cf} value={cf} className="text-xs">{contextLabels[cf]}</ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Select value={splitKey} onValueChange={onSplitKeyChange}>
        <SelectTrigger className="w-28 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {splitOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
