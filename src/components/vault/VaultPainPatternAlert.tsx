import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, parseISO, differenceInCalendarDays } from 'date-fns';
import { getBodyAreaLabel } from './quiz/body-maps/bodyAreaDefinitions';

interface QuizEntry {
  entry_date: string;
  pain_location: string[] | null;
}

/**
 * Finds body areas that have been logged with pain for 3+ consecutive days
 */
function findConsecutivePainAreas(quizData: QuizEntry[]): string[] {
  if (quizData.length < 3) return [];

  // Sort by date ascending (oldest first)
  const sorted = [...quizData]
    .filter(q => q.pain_location && q.pain_location.length > 0)
    .sort((a, b) => 
      new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
    );

  if (sorted.length < 3) return [];

  // Track consecutive days for each area
  const areaStreaks: Record<string, { count: number; lastDate: string }> = {};
  const alertAreas: Set<string> = new Set();

  for (const entry of sorted) {
    if (!entry.pain_location?.length) continue;

    const currentDate = entry.entry_date;
    
    for (const area of entry.pain_location) {
      const streak = areaStreaks[area];
      
      if (streak) {
        // Check if this entry is exactly 1 day after the last entry for this area
        const daysDiff = differenceInCalendarDays(
          parseISO(currentDate),
          parseISO(streak.lastDate)
        );
        
        if (daysDiff === 1) {
          // Consecutive day - increment streak
          streak.count += 1;
          streak.lastDate = currentDate;
          
          if (streak.count >= 3) {
            alertAreas.add(area);
          }
        } else if (daysDiff > 1) {
          // Gap in days - reset streak
          areaStreaks[area] = { count: 1, lastDate: currentDate };
        }
        // If daysDiff === 0, same day entry - ignore
      } else {
        // First occurrence of this area
        areaStreaks[area] = { count: 1, lastDate: currentDate };
      }
    }
  }

  return Array.from(alertAreas);
}

/**
 * Checks for pain patterns and notifies the user if any body area
 * has been logged with pain for 3+ consecutive days
 */
export async function checkPainPatternAndNotify(
  userId: string,
  t: (key: string, options?: Record<string, unknown>) => string
): Promise<void> {
  try {
    // Get the last 7 days of pre_lift quizzes with pain data
    const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    
    const { data: quizData, error } = await supabase
      .from('vault_focus_quizzes')
      .select('entry_date, pain_location')
      .eq('user_id', userId)
      .eq('quiz_type', 'pre_lift')
      .gte('entry_date', sevenDaysAgo)
      .order('entry_date', { ascending: true });

    if (error) {
      console.error('Error fetching pain data:', error);
      return;
    }

    if (!quizData || quizData.length < 3) return;

    // Find areas with 3+ consecutive days of pain
    const consecutivePainAreas = findConsecutivePainAreas(quizData);

    if (consecutivePainAreas.length > 0) {
      // Convert area IDs to display names using centralized definitions
      const areaNames = consecutivePainAreas
        .map(id => getBodyAreaLabel(id))
        .join(', ');

      const title = t('vault.painAlert.title', { defaultValue: '⚠️ Pain Pattern Detected' });
      const description = t('vault.painAlert.description', { 
        defaultValue: `You've logged ${areaNames} pain for 3+ consecutive days. Consider consulting a professional to prevent injury.`,
        areas: areaNames 
      });

      toast.error(title, {
        description,
        duration: 8000,
      });
    }
  } catch (err) {
    console.error('Error checking pain patterns:', err);
  }
}
