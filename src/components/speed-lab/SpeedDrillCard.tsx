import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DrillData } from '@/data/speedLabProgram';

interface SpeedDrillCardProps {
  drill: DrillData;
  completed: boolean;
  onToggle: (completed: boolean) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  activation: 'Warm-Up',
  isometric: 'Preload',
  sprint_mechanics: 'Sprint',
  plyometric: 'Plyo',
  resisted: 'Resisted',
  cool_down: 'Cool-Down',
  break_day: 'Recovery',
};

const CATEGORY_COLORS: Record<string, string> = {
  activation: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  isometric: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  sprint_mechanics: 'bg-red-500/10 text-red-700 dark:text-red-400',
  plyometric: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  resisted: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  cool_down: 'bg-teal-500/10 text-teal-700 dark:text-teal-400',
  break_day: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
};

export function SpeedDrillCard({ drill, completed, onToggle }: SpeedDrillCardProps) {
  const { t } = useTranslation();

  return (
    <Card
      className={`transition-all duration-200 cursor-pointer ${
        completed ? 'opacity-60 bg-muted/30' : 'hover:shadow-md'
      }`}
      onClick={() => onToggle(!completed)}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <div className="pt-0.5">
          <Checkbox
            checked={completed}
            onCheckedChange={(checked) => onToggle(!!checked)}
            className="h-6 w-6"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`font-semibold text-sm ${completed ? 'line-through' : ''}`}>
              {drill.name}
            </span>
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[drill.category] || ''}`}>
              {t(`speedLab.categories.${drill.category}`, CATEGORY_LABELS[drill.category] || drill.category)}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1 mb-1">
            {drill.cues.map((cue, i) => (
              <span key={i} className="text-xs text-muted-foreground">
                {i > 0 ? '• ' : ''}{cue}
              </span>
            ))}
          </div>
          <span className="text-xs font-medium text-primary/80">
            {drill.setsReps}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
