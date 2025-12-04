import { useTranslation } from "react-i18next";
import { Shield, Move, Dumbbell, Target, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const phases = [
  {
    key: "protection",
    icon: Shield,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500",
  },
  {
    key: "restore",
    icon: Move,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500",
  },
  {
    key: "strengthen",
    icon: Dumbbell,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500",
  },
  {
    key: "return",
    icon: Target,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500",
  },
];

export function ReturnToPlayPhases() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {t('bounceBackBay.returnToPlay.intro')}
      </p>

      {/* Phase Timeline */}
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-red-500 via-yellow-500 to-green-500 hidden sm:block" />

        <div className="space-y-4">
          {phases.map((phase, index) => {
            const Icon = phase.icon;
            return (
              <Card key={phase.key} className={`border-l-4 ${phase.borderColor} relative`}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 sm:p-3 rounded-full ${phase.bgColor} shrink-0 z-10`}>
                      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${phase.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {t('bounceBackBay.returnToPlay.phase')} {index + 1}
                        </Badge>
                        <h4 className="font-semibold text-sm sm:text-base">
                          {t(`bounceBackBay.returnToPlay.phases.${phase.key}.title`)}
                        </h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {t(`bounceBackBay.returnToPlay.phases.${phase.key}.description`)}
                      </p>
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {t('bounceBackBay.returnToPlay.keyFocus')}:
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {[1, 2, 3, 4].map((num) => (
                            <li key={num} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <CheckCircle2 className={`h-3.5 w-3.5 ${phase.color} shrink-0`} />
                              <span>{t(`bounceBackBay.returnToPlay.phases.${phase.key}.focus${num}`)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Important Note */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ArrowRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm mb-1">
                {t('bounceBackBay.returnToPlay.progressionNote.title')}
              </h4>
              <p className="text-xs text-muted-foreground">
                {t('bounceBackBay.returnToPlay.progressionNote.description')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
