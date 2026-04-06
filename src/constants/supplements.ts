import type { VitaminCategory, VitaminUnit } from '@/hooks/useVitaminLogs';

export interface SupplementRef {
  category: VitaminCategory;
  unit: VitaminUnit;
  note: string;
  dosageRange: string;
}

export const SUPPLEMENT_REFERENCE: Record<string, SupplementRef> = {
  'Vitamin D3':      { category: 'vitamin',    unit: 'IU',      note: 'Supports bone density, immune regulation & testosterone synthesis.',          dosageRange: '1000–5000 IU' },
  'Vitamin C':       { category: 'vitamin',    unit: 'mg',      note: 'Antioxidant; accelerates collagen repair in connective tissue post-training.', dosageRange: '500–1000 mg' },
  'Vitamin B12':     { category: 'vitamin',    unit: 'mcg',     note: 'Essential for red blood cell production and nerve signal velocity.',            dosageRange: '500–1000 mcg' },
  'Vitamin K2':      { category: 'vitamin',    unit: 'mcg',     note: 'Directs calcium into bone, preventing arterial calcification.',               dosageRange: '100–200 mcg' },
  'Vitamin B6':      { category: 'vitamin',    unit: 'mg',      note: 'Critical for amino acid metabolism and neurotransmitter synthesis.',           dosageRange: '25–100 mg' },
  'Folate (B9)':     { category: 'vitamin',    unit: 'mcg',     note: 'DNA repair and cell division; critical during high training load.',            dosageRange: '400–800 mcg' },
  'Magnesium':       { category: 'mineral',    unit: 'mg',      note: 'Required for 300+ enzymatic reactions; reduces muscle cramping & aids sleep.', dosageRange: '200–400 mg' },
  'Zinc':            { category: 'mineral',    unit: 'mg',      note: 'Supports testosterone production, immune defense, and protein synthesis.',     dosageRange: '15–30 mg' },
  'Iron':            { category: 'mineral',    unit: 'mg',      note: 'Oxygen transport via hemoglobin; low iron = blunted VO2 capacity.',            dosageRange: '18–45 mg' },
  'Calcium':         { category: 'mineral',    unit: 'mg',      note: 'Bone matrix density and muscular contraction signaling.',                     dosageRange: '500–1000 mg' },
  'Potassium':       { category: 'mineral',    unit: 'mg',      note: 'Electrolyte regulating cardiac rhythm and muscle contraction.',               dosageRange: '200–400 mg' },
  'Selenium':        { category: 'mineral',    unit: 'mcg',     note: 'Thyroid hormone conversion and antioxidant enzyme co-factor.',                dosageRange: '55–200 mcg' },
  'Iodine':          { category: 'mineral',    unit: 'mcg',     note: 'Essential for thyroid hormone synthesis governing metabolic rate.',           dosageRange: '150–300 mcg' },
  'Omega-3':         { category: 'supplement', unit: 'g',       note: 'Reduces systemic inflammation; improves joint mobility and CNS recovery.',    dosageRange: '2–4 g EPA/DHA' },
  'Creatine':        { category: 'supplement', unit: 'g',       note: 'Regenerates phosphocreatine for explosive power; proven in 1000+ studies.',   dosageRange: '3–5 g' },
  'Melatonin':       { category: 'supplement', unit: 'mg',      note: 'Regulates circadian rhythm; improves deep-sleep architecture for recovery.',  dosageRange: '0.5–3 mg' },
  'CoQ10':           { category: 'supplement', unit: 'mg',      note: 'Mitochondrial electron transport; reduces oxidative stress under high load.',  dosageRange: '100–300 mg' },
  'Ashwagandha':     { category: 'herb',       unit: 'mg',      note: 'Adaptogen that lowers cortisol; improves strength output under stress.',      dosageRange: '300–600 mg' },
  'Rhodiola Rosea':  { category: 'herb',       unit: 'mg',      note: 'Reduces mental fatigue; shown to cut perceived exertion during high load.',   dosageRange: '200–400 mg' },
  'Turmeric':        { category: 'herb',       unit: 'mg',      note: 'Curcumin inhibits NF-κB inflammatory pathway for tissue repair.',            dosageRange: '500–1500 mg' },
  'Whey Protein':    { category: 'protein',    unit: 'serving', note: 'Fast-digesting; peaks plasma amino acids within 60 min for MPS trigger.',    dosageRange: '20–40 g' },
  'Casein Protein':  { category: 'protein',    unit: 'serving', note: 'Slow-release; sustains amino acid elevation 5–7 h for overnight repair.',    dosageRange: '25–40 g' },
  'Collagen':        { category: 'protein',    unit: 'g',       note: 'Stimulates tendon & ligament collagen synthesis; peak effect with Vit C.',   dosageRange: '10–15 g' },
  'Beta-Alanine':    { category: 'amino_acid', unit: 'g',       note: 'Buffers muscle acidosis (H⁺) during high-intensity sets lasting 1–4 min.',   dosageRange: '3.2–6.4 g' },
  'L-Glutamine':     { category: 'amino_acid', unit: 'g',       note: 'Gut lining integrity and immune function under heavy training stress.',       dosageRange: '5–10 g' },
  'L-Citrulline':    { category: 'amino_acid', unit: 'g',       note: 'Converts to arginine; raises NO for vasodilation and pump.',                 dosageRange: '6–8 g' },
  'BCAA':            { category: 'amino_acid', unit: 'g',       note: 'Leucine initiates mTOR signaling; reduces exercise-induced muscle damage.',   dosageRange: '5–10 g' },
  'Taurine':         { category: 'amino_acid', unit: 'mg',      note: 'Osmoregulation in muscle cells; reduces exercise-induced oxidative stress.',  dosageRange: '1000–3000 mg' },
  'Caffeine':        { category: 'supplement', unit: 'mg',      note: 'Adenosine receptor antagonist; sharpens focus and delays fatigue onset.',     dosageRange: '3–6 mg/kg BW' },
  'Electrolytes':    { category: 'mineral',    unit: 'serving', note: 'Na⁺/K⁺/Mg²⁺ balance critical for nerve signaling during sweat loss.',        dosageRange: '1 serving' },
};

export const SUPPLEMENT_NAMES = Object.keys(SUPPLEMENT_REFERENCE);
