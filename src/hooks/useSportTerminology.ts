import { useSportTheme } from '@/contexts/SportThemeContext';
import { useTranslation } from 'react-i18next';
import { getTerm, type SportKey, type TerminologyDictionary } from '@/data/sportTerminology';

export function useSportTerminology() {
  const { sport } = useSportTheme();
  const { t } = useTranslation();
  const sportKey = (sport || 'baseball') as SportKey;

  const term = (category: keyof TerminologyDictionary, key: string): string => {
    return getTerm(sportKey, category, key);
  };

  return { term, sport: sportKey };
}
