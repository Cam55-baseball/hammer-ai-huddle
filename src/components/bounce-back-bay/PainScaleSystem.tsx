import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";

export function PainScaleSystem() {
  const { t } = useTranslation();
  const [painLevel, setPainLevel] = useState([3]);

  const getPainInfo = (level: number) => {
    if (level <= 2) {
      return {
        label: t('bounceBackBay.painScale.levels.minimal.label'),
        description: t('bounceBackBay.painScale.levels.minimal.description'),
        recommendation: t('bounceBackBay.painScale.levels.minimal.recommendation'),
        color: "emerald",
        icon: CheckCircle2,
      };
    } else if (level <= 4) {
      return {
        label: t('bounceBackBay.painScale.levels.mild.label'),
        description: t('bounceBackBay.painScale.levels.mild.description'),
        recommendation: t('bounceBackBay.painScale.levels.mild.recommendation'),
        color: "green",
        icon: CheckCircle2,
      };
    } else if (level <= 6) {
      return {
        label: t('bounceBackBay.painScale.levels.moderate.label'),
        description: t('bounceBackBay.painScale.levels.moderate.description'),
        recommendation: t('bounceBackBay.painScale.levels.moderate.recommendation'),
        color: "amber",
        icon: Info,
      };
    } else if (level <= 8) {
      return {
        label: t('bounceBackBay.painScale.levels.severe.label'),
        description: t('bounceBackBay.painScale.levels.severe.description'),
        recommendation: t('bounceBackBay.painScale.levels.severe.recommendation'),
        color: "orange",
        icon: AlertTriangle,
      };
    } else {
      return {
        label: t('bounceBackBay.painScale.levels.extreme.label'),
        description: t('bounceBackBay.painScale.levels.extreme.description'),
        recommendation: t('bounceBackBay.painScale.levels.extreme.recommendation'),
        color: "red",
        icon: AlertCircle,
      };
    }
  };

  const currentLevel = painLevel[0];
  const painInfo = getPainInfo(currentLevel);
  const Icon = painInfo.icon;

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; slider: string }> = {
      emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400", slider: "bg-emerald-500" },
      green: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-600 dark:text-green-400", slider: "bg-green-500" },
      amber: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-600 dark:text-amber-400", slider: "bg-amber-500" },
      orange: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-600 dark:text-orange-400", slider: "bg-orange-500" },
      red: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-600 dark:text-red-400", slider: "bg-red-500" },
    };
    return colors[color] || colors.emerald;
  };

  const colors = getColorClasses(painInfo.color);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {t('bounceBackBay.painScale.intro')}
      </p>

      {/* Pain Level Slider */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t('bounceBackBay.painScale.noPain')}</span>
          <span className="text-sm font-medium">{t('bounceBackBay.painScale.worstPain')}</span>
        </div>
        
        <Slider
          value={painLevel}
          onValueChange={setPainLevel}
          max={10}
          min={0}
          step={1}
          className="w-full"
        />
        
        {/* Scale Numbers */}
        <div className="flex justify-between px-1">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <span 
              key={num} 
              className={`text-xs ${num === currentLevel ? 'font-bold text-primary' : 'text-muted-foreground'}`}
            >
              {num}
            </span>
          ))}
        </div>
      </div>

      {/* Current Pain Level Display */}
      <Card className={`${colors.bg} ${colors.border} border-2`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${colors.bg} border ${colors.border}`}>
              <Icon className={`h-6 w-6 ${colors.text}`} />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">{currentLevel}</span>
                <Badge className={`${colors.bg} ${colors.text} border ${colors.border}`}>
                  {painInfo.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{painInfo.description}</p>
              <div className={`p-3 rounded-lg ${colors.bg} border ${colors.border}`}>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  {t('bounceBackBay.painScale.recommendation')}:
                </p>
                <p className="text-sm text-muted-foreground mt-1">{painInfo.recommendation}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scale Reference */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
        {[
          { range: "0-2", label: t('bounceBackBay.painScale.ranges.minimal'), color: "emerald" },
          { range: "3-4", label: t('bounceBackBay.painScale.ranges.mild'), color: "green" },
          { range: "5-6", label: t('bounceBackBay.painScale.ranges.moderate'), color: "amber" },
          { range: "7-8", label: t('bounceBackBay.painScale.ranges.severe'), color: "orange" },
          { range: "9-10", label: t('bounceBackBay.painScale.ranges.extreme'), color: "red" },
        ].map((item) => {
          const itemColors = getColorClasses(item.color);
          return (
            <div key={item.range} className={`p-2 rounded-lg ${itemColors.bg} border ${itemColors.border}`}>
              <p className={`font-bold ${itemColors.text}`}>{item.range}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
