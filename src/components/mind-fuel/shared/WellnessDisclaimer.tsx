import { useTranslation } from 'react-i18next';
import { AlertTriangle, Info } from 'lucide-react';

interface WellnessDisclaimerProps {
  variant?: 'default' | 'healing';
}

export default function WellnessDisclaimer({ variant = 'default' }: WellnessDisclaimerProps) {
  const { t } = useTranslation();

  if (variant === 'healing') {
    return (
      <div className="flex gap-3 p-4 rounded-xl bg-wellness-warning/10 border border-wellness-warning/20">
        <AlertTriangle className="h-5 w-5 text-wellness-warning shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-wellness-warning-foreground mb-1">
            {t('mentalWellness.disclaimer.healingTitle', 'Important: This is Not Therapy')}
          </p>
          <p className="text-muted-foreground">
            {t('mentalWellness.disclaimer.healingText', 'This content is for educational and self-reflection purposes only. It is not a substitute for professional mental health treatment. If you are experiencing significant distress or trauma, please consult a licensed therapist or counselor.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 p-4 rounded-xl bg-wellness-soft-gray border border-border/50">
      <Info className="h-5 w-5 text-wellness-lavender shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-medium text-foreground mb-1">
          {t('mentalWellness.disclaimer.title', 'Mental Wellness Disclaimer')}
        </p>
        <p className="text-muted-foreground">
          {t('mentalWellness.disclaimer.text', 'This section provides mental wellness education and self-help tools. It is not intended to diagnose, treat, or replace professional mental health services. If you are experiencing a mental health crisis, please contact a crisis helpline or mental health professional.')}
        </p>
      </div>
    </div>
  );
}
