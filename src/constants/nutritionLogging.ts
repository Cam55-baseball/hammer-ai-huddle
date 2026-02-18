/**
 * Shared nutrition logging constants and utilities.
 * Single source of truth — import from here in all logging components.
 */

export const DIGESTION_TAGS = [
  { label: 'Felt great ✅', value: 'Felt great' },
  { label: 'Energized ⚡', value: 'Energized' },
  { label: 'Light 🪶', value: 'Light' },
  { label: 'Bloated 🫧', value: 'Bloated' },
  { label: 'Heavy 🧱', value: 'Heavy' },
  { label: 'Cramps 😣', value: 'Cramps' },
  { label: 'Heartburn 🔥', value: 'Heartburn' },
  { label: 'Nauseous 🤢', value: 'Nauseous' },
];

/**
 * Convert a 24h time string ("HH:mm") to a user-friendly 12h string ("h:mm AM/PM").
 */
export const convertMealTime = (time24: string): string => {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
};

/**
 * Toggle a digestion tag in a comma-separated notes string.
 */
export const toggleDigestionTagInNotes = (prev: string, value: string): string => {
  const existing = prev.split(',').map(s => s.trim()).filter(Boolean);
  if (existing.includes(value)) {
    return existing.filter(s => s !== value).join(', ');
  }
  return existing.length > 0 ? `${prev.trim().replace(/,$/, '')}, ${value}` : value;
};
