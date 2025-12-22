import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Info } from 'lucide-react';

export default function TexVisionDisclaimer() {
  const { t } = useTranslation();

  return (
    <Card className="bg-[hsl(var(--tex-vision-primary))]/30 border-[hsl(var(--tex-vision-primary-light))]/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-[hsl(var(--tex-vision-feedback))] flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm text-[hsl(var(--tex-vision-text-muted))]">
              {t('texVision.disclaimer.main', 'Tex Vision is designed to enhance visual-motor skills for athletic performance. These exercises are not medical treatments and should not replace professional eye care.')}
            </p>
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--tex-vision-timing))]">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>
                {t('texVision.disclaimer.fatigue', 'Stop immediately if you experience eye strain, headaches, or discomfort. Take regular breaks and consult an eye care professional if symptoms persist.')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
