import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
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
  const [expanded, setExpanded] = useState(false);

  const drillName = t(`speedLab.drillData.${drill.id}.name`, drill.name);
  const drillDesc = t(`speedLab.drillData.${drill.id}.description`, drill.description);
  const drillWhy = t(`speedLab.drillData.${drill.id}.whyItHelps`, drill.whyItHelps);

  return (
    <Card
      className={`transition-all duration-200 ${
        completed ? 'opacity-60 bg-muted/30' : 'hover:shadow-md'
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="pt-0.5">
            <Checkbox
              checked={completed}
              onCheckedChange={(checked) => onToggle(!!checked)}
              className="h-6 w-6"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <button
                onClick={() => setExpanded(!expanded)}
                className={`font-semibold text-sm text-left ${completed ? 'line-through' : ''} hover:text-primary transition-colors`}
              >
                {drillName}
              </button>
              <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[drill.category] || ''}`}>
                {t(`speedLab.categories.${drill.category}`, CATEGORY_LABELS[drill.category] || drill.category)}
              </Badge>
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                className="ml-auto text-muted-foreground hover:text-foreground"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex flex-wrap gap-1 mb-1">
              {drill.cues.map((cue, i) => (
                <span key={i} className="text-xs text-muted-foreground">
                  {i > 0 ? '• ' : ''}{t(`speedLab.drillData.${drill.id}.cue${i}`, cue)}
                </span>
              ))}
            </div>

            <span className="text-xs font-medium text-primary/80">
              {drill.setsReps}
            </span>

            {/* Expandable description & why it helps */}
            {expanded && (
              <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-sm text-foreground leading-relaxed">
                    {drillDesc}
                  </p>
                </div>
                <div className="flex items-start gap-2 bg-primary/5 rounded-lg p-3">
                  <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-primary font-medium leading-relaxed">
                    {drillWhy}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
