/**
 * Hydration quality classification system.
 * Classifies liquids as "quality" (hydrating, nutrient-rich) or "filler" (sugary, processed).
 */

export type QualityClass = 'quality' | 'filler';

export interface LiquidType {
  value: string;
  label: string;
  emoji: string;
  defaultQuality: QualityClass;
}

export const LIQUID_TYPES: LiquidType[] = [
  { value: 'water', label: 'Water', emoji: '💧', defaultQuality: 'quality' },
  { value: 'coconut_water', label: 'Coconut Water', emoji: '🥥', defaultQuality: 'quality' },
  { value: 'juice_natural', label: 'Natural Juice', emoji: '🍊', defaultQuality: 'quality' },
  { value: 'milk', label: 'Milk', emoji: '🥛', defaultQuality: 'quality' },
  { value: 'goat_milk', label: 'Goat Milk', emoji: '🐐', defaultQuality: 'quality' },
  { value: 'smoothie', label: 'Smoothie', emoji: '🥤', defaultQuality: 'quality' },
  { value: 'tea', label: 'Tea', emoji: '🍵', defaultQuality: 'quality' },
  { value: 'coffee', label: 'Coffee', emoji: '☕', defaultQuality: 'quality' },
  { value: 'sports_drink', label: 'Sports Drink', emoji: '⚡', defaultQuality: 'filler' },
  { value: 'soda', label: 'Soda', emoji: '🥤', defaultQuality: 'filler' },
  { value: 'juice_artificial', label: 'Artificial Juice', emoji: '🧃', defaultQuality: 'filler' },
  { value: 'energy_drink', label: 'Energy Drink', emoji: '🔋', defaultQuality: 'filler' },
  { value: 'other', label: 'Other', emoji: '🫗', defaultQuality: 'quality' },
];

const QUALITY_MAP: Record<string, QualityClass> = Object.fromEntries(
  LIQUID_TYPES.map(lt => [lt.value, lt.defaultQuality])
);

/**
 * Auto-classify a liquid type into quality or filler.
 */
export function classifyLiquid(liquidType: string): QualityClass {
  return QUALITY_MAP[liquidType] ?? 'quality';
}

/**
 * Get the display info for a liquid type value.
 */
export function getLiquidTypeInfo(value: string): LiquidType | undefined {
  return LIQUID_TYPES.find(lt => lt.value === value);
}
