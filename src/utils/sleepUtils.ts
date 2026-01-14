/**
 * Sleep utility functions for calculating sleep duration and providing
 * energy/readiness analysis based on hours slept.
 */

export interface SleepAnalysis {
  level: 'low' | 'moderate-low' | 'moderate' | 'good' | 'optimal' | 'excessive';
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Calculate sleep duration in hours from bedtime and wake time.
 * Handles overnight sleep (e.g., 10:30 PM to 6:30 AM).
 * 
 * @param bedtime - Time string in HH:MM format (24-hour)
 * @param wakeTime - Time string in HH:MM format (24-hour)
 * @returns Number of hours slept (decimal)
 */
export function calculateSleepDuration(bedtime: string, wakeTime: string): number {
  if (!bedtime || !wakeTime) return 0;
  
  const [bedHour, bedMinute] = bedtime.split(':').map(Number);
  const [wakeHour, wakeMinute] = wakeTime.split(':').map(Number);
  
  // Convert to minutes since midnight
  let bedMinutes = bedHour * 60 + bedMinute;
  let wakeMinutes = wakeHour * 60 + wakeMinute;
  
  // If wake time is before bed time, it means we crossed midnight
  if (wakeMinutes <= bedMinutes) {
    // Add 24 hours (1440 minutes) to wake time
    wakeMinutes += 1440;
  }
  
  const durationMinutes = wakeMinutes - bedMinutes;
  const hours = durationMinutes / 60;
  
  // Round to 1 decimal place
  return Math.round(hours * 10) / 10;
}

/**
 * Get sleep analysis based on hours slept.
 * Returns energy level, messaging, and styling information.
 * 
 * @param hours - Number of hours slept
 * @returns SleepAnalysis object with level, emoji, colors
 */
export function getSleepAnalysis(hours: number): SleepAnalysis {
  if (hours < 5) {
    return {
      level: 'low',
      emoji: '🔴',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    };
  } else if (hours < 6) {
    return {
      level: 'moderate-low',
      emoji: '🟠',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
    };
  } else if (hours < 7) {
    return {
      level: 'moderate',
      emoji: '🟡',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
    };
  } else if (hours < 8) {
    return {
      level: 'good',
      emoji: '🟢',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    };
  } else if (hours <= 9) {
    return {
      level: 'optimal',
      emoji: '🟢',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
    };
  } else {
    return {
      level: 'excessive',
      emoji: '🟡',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
    };
  }
}

/**
 * Format hours to a readable string.
 * 
 * @param hours - Number of hours
 * @returns Formatted string like "8 hours" or "7.5 hours"
 */
export function formatSleepDuration(hours: number): string {
  if (hours === 1) return '1 hour';
  if (Number.isInteger(hours)) return `${hours} hours`;
  return `${hours} hours`;
}
