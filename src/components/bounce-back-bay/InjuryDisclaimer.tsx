import { useTranslation } from "react-i18next";
import { AlertTriangle, Shield, Stethoscope, FileWarning, Heart } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function InjuryDisclaimer() {
  const { t } = useTranslation();

  return (
    <Alert className="bg-red-500/10 border-2 border-red-500/50 text-red-100">
      <div className="space-y-4">
        {/* Main Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-500/20 rounded-full">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <AlertTitle className="text-xl font-bold text-red-500 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('bounceBackBay.disclaimer.title')}
            </AlertTitle>
            <p className="text-sm text-red-400 mt-1">{t('bounceBackBay.disclaimer.subtitle')}</p>
          </div>
        </div>

        <AlertDescription className="space-y-4 text-foreground">
          {/* Key Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-red-500/30">
              <FileWarning className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">{t('bounceBackBay.disclaimer.points.educational.title')}</p>
                <p className="text-xs text-muted-foreground">{t('bounceBackBay.disclaimer.points.educational.description')}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-red-500/30">
              <Stethoscope className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">{t('bounceBackBay.disclaimer.points.noDiagnosis.title')}</p>
                <p className="text-xs text-muted-foreground">{t('bounceBackBay.disclaimer.points.noDiagnosis.description')}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-red-500/30">
              <Heart className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">{t('bounceBackBay.disclaimer.points.seekHelp.title')}</p>
                <p className="text-xs text-muted-foreground">{t('bounceBackBay.disclaimer.points.seekHelp.description')}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-red-500/30">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">{t('bounceBackBay.disclaimer.points.emergency.title')}</p>
                <p className="text-xs text-muted-foreground">{t('bounceBackBay.disclaimer.points.emergency.description')}</p>
              </div>
            </div>
          </div>

          {/* Full Disclaimer Text */}
          <div className="p-4 bg-background/50 rounded-lg border border-red-500/30 space-y-2">
            <p className="text-sm">
              <strong>{t('bounceBackBay.disclaimer.fullText.para1')}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              {t('bounceBackBay.disclaimer.fullText.para2')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('bounceBackBay.disclaimer.fullText.para3')}
            </p>
            <p className="text-sm font-semibold text-red-500 mt-3">
              {t('bounceBackBay.disclaimer.fullText.warning')}
            </p>
          </div>

          {/* Bottom note */}
          <p className="text-xs text-center text-muted-foreground italic">
            {t('bounceBackBay.disclaimer.bottomNote')}
          </p>
        </AlertDescription>
      </div>
    </Alert>
  );
}
