export interface ConversionCopy {
  headline: string;
  subhead: string;
  cta: string;
}

export function conversionCopy(simId: string, severity: 'minor'|'moderate'|'critical', gap: number | string): ConversionCopy {
  const g = typeof gap === 'number' ? gap : parseFloat(String(gap)) || 0;
  if (simId === 'hitting') {
    if (severity === 'critical') return {
      headline: `You're leaving ${g.toFixed(1)} mph on the table.`,
      subhead: '3 drills already mapped to your swing fix this. Unlock them now.',
      cta: 'Unlock my drills',
    };
    if (severity === 'moderate') return {
      headline: `${g.toFixed(1)} mph between you and elite contact.`,
      subhead: 'Targeted prescription based on your launch and bat-path data.',
      cta: 'See my prescription',
    };
    return { headline: 'You\'re close to elite — lock it in.', subhead: 'Three consistency drills to barrel up under pressure.', cta: 'Unlock the system' };
  }
  if (simId === 'program') {
    if (severity === 'critical') return {
      headline: `Your plan misses ${g}% of elite weekly load.`,
      subhead: '3 modules rebuild your week safely — full periodization included.',
      cta: 'Unlock my plan',
    };
    if (severity === 'moderate') return {
      headline: `Add ${g}% more elite stimulus this week.`,
      subhead: 'Volume + recovery prescription built for your level.',
      cta: 'See my plan',
    };
    return { headline: 'Your frequency is elite — periodize it.', subhead: 'Three blocks to convert effort into measurable gain.', cta: 'Unlock the system' };
  }
  // vault / generic
  if (severity === 'critical') return {
    headline: 'Performance layers are hidden from you.',
    subhead: 'Unlock the Vault to see your real ceiling — your full history, side-by-side.',
    cta: 'Unlock the Vault',
  };
  return { headline: 'See what you\'re missing.', subhead: 'The Vault holds the data that will move your game.', cta: 'Unlock the Vault' };
}
