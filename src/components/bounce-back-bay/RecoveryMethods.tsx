import { useTranslation } from "react-i18next";
import { Snowflake, Flame, Clock, Moon, Droplets, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function RecoveryMethods() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {t('bounceBackBay.recoveryMethods.intro')}
      </p>

      {/* Ice vs Heat Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ice */}
        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Snowflake className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <CardTitle className="text-base">{t('bounceBackBay.recoveryMethods.ice.title')}</CardTitle>
                <CardDescription className="text-xs">{t('bounceBackBay.recoveryMethods.ice.subtitle')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Badge variant="outline" className="text-xs mb-2">{t('bounceBackBay.recoveryMethods.whenToUse')}</Badge>
              <ul className="space-y-1.5">
                {[1, 2, 3].map((num) => (
                  <li key={num} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-cyan-500">•</span>
                    {t(`bounceBackBay.recoveryMethods.ice.use${num}`)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {t('bounceBackBay.recoveryMethods.ice.timing')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Heat */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-base">{t('bounceBackBay.recoveryMethods.heat.title')}</CardTitle>
                <CardDescription className="text-xs">{t('bounceBackBay.recoveryMethods.heat.subtitle')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Badge variant="outline" className="text-xs mb-2">{t('bounceBackBay.recoveryMethods.whenToUse')}</Badge>
              <ul className="space-y-1.5">
                {[1, 2, 3].map((num) => (
                  <li key={num} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    {t(`bounceBackBay.recoveryMethods.heat.use${num}`)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {t('bounceBackBay.recoveryMethods.heat.timing')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* General Recovery Principles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            {t('bounceBackBay.recoveryMethods.principles.title')}
          </CardTitle>
          <CardDescription>{t('bounceBackBay.recoveryMethods.principles.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rest */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Moon className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <h4 className="font-medium text-sm">{t('bounceBackBay.recoveryMethods.principles.rest.title')}</h4>
                <p className="text-xs text-muted-foreground">{t('bounceBackBay.recoveryMethods.principles.rest.description')}</p>
              </div>
            </div>
            {/* Hydration */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Droplets className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <h4 className="font-medium text-sm">{t('bounceBackBay.recoveryMethods.principles.hydration.title')}</h4>
                <p className="text-xs text-muted-foreground">{t('bounceBackBay.recoveryMethods.principles.hydration.description')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
