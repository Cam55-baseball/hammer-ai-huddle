/**
 * Fixed mapping: nutrient key → athlete-relevant performance outcome.
 * Used by GuidancePanel and DeficiencyAlert for contextual impact labels.
 * No estimation — pure static reference data.
 */
export const NUTRIENT_IMPACT: Record<string, string> = {
  magnesium_mg: 'Recovery / sleep quality',
  iron_mg: 'Energy / oxygen transport',
  vitamin_b12_mcg: 'Cognitive function / energy',
  vitamin_c_mg: 'Immune support / recovery',
  potassium_mg: 'Hydration / muscle function',
  calcium_mg: 'Bone strength / muscle contraction',
  zinc_mg: 'Immune function / tissue repair',
  vitamin_d_mcg: 'Bone health / immune support',
  vitamin_a_mcg: 'Vision / immune support',
  folate_mcg: 'Cell repair / energy metabolism',
  vitamin_b6_mg: 'Protein metabolism / energy',
  vitamin_e_mg: 'Antioxidant / cell protection',
  vitamin_k_mcg: 'Blood clotting / bone health',
};

/** Active physiological framing — used when a nutrient is a limiting factor */
export const NUTRIENT_IMPACT_ACTIVE: Record<string, string> = {
  magnesium_mg: 'Low magnesium may reduce recovery quality',
  iron_mg: 'Low iron may limit energy output',
  vitamin_b12_mcg: 'Low B12 may impair cognitive function',
  vitamin_c_mg: 'Low vitamin C may weaken immune response',
  potassium_mg: 'Low potassium may impair muscle function',
  calcium_mg: 'Low calcium may compromise bone integrity',
  zinc_mg: 'Low zinc may slow tissue repair',
  vitamin_d_mcg: 'Low vitamin D may reduce bone and immune health',
  vitamin_a_mcg: 'Low vitamin A may affect vision and immunity',
  folate_mcg: 'Low folate may slow cell repair',
  vitamin_b6_mg: 'Low B6 may reduce protein metabolism',
  vitamin_e_mg: 'Low vitamin E may reduce cell protection',
  vitamin_k_mcg: 'Low vitamin K may impair clotting function',
};

/** Craving category → nutrient keys most commonly associated */
export const CRAVING_NUTRIENT_MAP: Record<string, string[]> = {
  sweet: ['magnesium_mg', 'iron_mg', 'calcium_mg'],
  salty: ['potassium_mg', 'magnesium_mg', 'zinc_mg'],
  chocolate: ['magnesium_mg', 'iron_mg', 'zinc_mg'],
  crunchy: ['calcium_mg', 'zinc_mg', 'magnesium_mg'],
};

export const CRAVING_OPTIONS = [
  { label: 'Sweet', value: 'sweet' },
  { label: 'Salty', value: 'salty' },
  { label: 'Chocolate', value: 'chocolate' },
  { label: 'Crunchy', value: 'crunchy' },
] as const;
