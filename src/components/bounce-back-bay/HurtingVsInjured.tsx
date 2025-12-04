import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle2, XCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function HurtingVsInjured() {
  const { t } = useTranslation();

  const hurtingSigns = [
    t('bounceBackBay.hurtingVsInjured.hurting.sign1'),
    t('bounceBackBay.hurtingVsInjured.hurting.sign2'),
    t('bounceBackBay.hurtingVsInjured.hurting.sign3'),
    t('bounceBackBay.hurtingVsInjured.hurting.sign4'),
  ];

  const injuredSigns = [
    t('bounceBackBay.hurtingVsInjured.injured.sign1'),
    t('bounceBackBay.hurtingVsInjured.injured.sign2'),
    t('bounceBackBay.hurtingVsInjured.injured.sign3'),
    t('bounceBackBay.hurtingVsInjured.injured.sign4'),
    t('bounceBackBay.hurtingVsInjured.injured.sign5'),
  ];

  return (
    <Card className="border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-teal-500/5">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <AlertCircle className="h-6 w-6 text-cyan-500" />
          </div>
          <div>
            <CardTitle className="text-xl">{t('bounceBackBay.hurtingVsInjured.title')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('bounceBackBay.hurtingVsInjured.subtitle')}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Normal Soreness / "Hurting" */}
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <h4 className="font-semibold text-emerald-600 dark:text-emerald-400">
                {t('bounceBackBay.hurtingVsInjured.hurting.title')}
              </h4>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {t('bounceBackBay.hurtingVsInjured.hurting.description')}
            </p>
            <ul className="space-y-2">
              {hurtingSigns.map((sign, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{sign}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Potential Injury / "Injured" */}
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <h4 className="font-semibold text-red-600 dark:text-red-400">
                {t('bounceBackBay.hurtingVsInjured.injured.title')}
              </h4>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {t('bounceBackBay.hurtingVsInjured.injured.description')}
            </p>
            <ul className="space-y-2">
              {injuredSigns.map((sign, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>{sign}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Alert className="bg-blue-500/10 border-blue-500/30">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-600 dark:text-blue-400">{t('bounceBackBay.hurtingVsInjured.note.title')}</AlertTitle>
          <AlertDescription className="text-sm">
            {t('bounceBackBay.hurtingVsInjured.note.description')}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
