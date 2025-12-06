import { useTranslation } from 'react-i18next';
import { AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function NutritionDisclaimer() {
  const { t } = useTranslation();

  return (
    <Alert variant="destructive" className="bg-amber-500/10 border-amber-500/50 text-amber-200">
      <AlertTriangle className="h-5 w-5 text-amber-400" />
      <AlertTitle className="text-amber-300 font-semibold">{t('nutrition.disclaimerTitle')}</AlertTitle>
      <AlertDescription className="text-amber-200/90 text-sm space-y-2 mt-2">
        <p>{t('nutrition.educationalPurposes')}</p>
        <p>{t('nutrition.alwaysConsult')}</p>
        <div className="flex items-start gap-2 mt-3 p-2 bg-amber-500/10 rounded-md">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span className="text-xs">{t('nutrition.aiTipsWarning')}</span>
        </div>
      </AlertDescription>
    </Alert>
  );
}
