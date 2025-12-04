import { useTranslation } from "react-i18next";
import { Flame, Activity, Zap, Target, CheckCircle2, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const categories = [
  {
    key: "warmup",
    icon: Flame,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    key: "strength",
    icon: Activity,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    key: "mobility",
    icon: Zap,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    key: "sportSpecific",
    icon: Target,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
];

export function InjuryPrevention() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {t('bounceBackBay.injuryPrevention.intro')}
      </p>

      {/* Prevention Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.key} className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${category.bgColor}`}>
                    <Icon className={`h-5 w-5 ${category.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {t(`bounceBackBay.injuryPrevention.categories.${category.key}.title`)}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {t(`bounceBackBay.injuryPrevention.categories.${category.key}.subtitle`)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {[1, 2, 3].map((num) => (
                    <li key={num} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className={`h-4 w-4 ${category.color} shrink-0 mt-0.5`} />
                      <span>{t(`bounceBackBay.injuryPrevention.categories.${category.key}.tip${num}`)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Common Patterns Section */}
      <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">
              {t('bounceBackBay.injuryPrevention.patterns.title')}
            </CardTitle>
          </div>
          <CardDescription>
            {t('bounceBackBay.injuryPrevention.patterns.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="flex items-center gap-2">
                <Badge variant="outline" className="shrink-0 text-xs">
                  {num}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t(`bounceBackBay.injuryPrevention.patterns.pattern${num}`)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
