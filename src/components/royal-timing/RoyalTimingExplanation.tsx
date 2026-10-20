import { useTranslation } from 'react-i18next';
import { ROYAL_TIMING_WHY } from '@/lib/hammer/toolPromptRules';

export function RoyalTimingExplanation() {
  const { t } = useTranslation();
  return <p className="text-sm leading-relaxed text-muted-foreground break-words" data-testid="royal-timing-explanation">
    {t('royalTiming.explanation', { defaultValue: ROYAL_TIMING_WHY })}
  </p>;
}