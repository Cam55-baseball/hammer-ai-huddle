/**
 * Get a date in local timezone as YYYY-MM-DD string.
 * This avoids timezone issues with toISOString() which uses UTC.
 * 
 * @param date - The date to format (defaults to current date)
 * @returns Date string in YYYY-MM-DD format in local timezone
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get today's date in local timezone as YYYY-MM-DD string.
 * Convenience wrapper around getLocalDateString().
 */
export const getTodayDate = (): string => getLocalDateString(new Date());
