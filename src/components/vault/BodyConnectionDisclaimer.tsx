import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface BodyConnectionDisclaimerProps {
  variant?: 'compact' | 'full';
  className?: string;
}

/**
 * Mandatory disclaimer for all fascia/body connection educational content.
 * This component ensures legal compliance by clearly stating that all
 * fascia science information is for educational purposes only.
 */
export function BodyConnectionDisclaimer({ 
  variant = 'compact',
  className 
}: BodyConnectionDisclaimerProps) {
  const { t } = useTranslation();

  if (variant === 'compact') {
    return (
      <p className={cn(
        "text-xs text-muted-foreground flex items-start gap-1.5 italic",
        className
      )}>
        <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5 text-amber-500" />
        <span>
          {t('fascia.disclaimer.compact', 
            "Just for learning! Always ask a doctor or trainer about pain that doesn't go away."
          )}
        </span>
      </p>
    );
  }

  return (
    <Alert className={cn(
      "bg-amber-500/10 border-amber-500/30",
      className
    )}>
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertDescription className="text-xs text-amber-200/90 space-y-1.5">
        <p className="font-semibold text-amber-300">
          {t('fascia.disclaimer.title', '⚠️ Just For Learning!')}
        </p>
        <p>
          {t('fascia.disclaimer.text', 
            "This is educational information to help you understand how your body connects. It is NOT medical advice."
          )}
        </p>
        <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
          <li>{t('fascia.disclaimer.bullet1', 'Tell your coach or parent if something hurts')}</li>
          <li>{t('fascia.disclaimer.bullet2', 'See a doctor or athletic trainer for real pain')}</li>
          <li>{t('fascia.disclaimer.bullet3', "Don't train through serious pain")}</li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}
