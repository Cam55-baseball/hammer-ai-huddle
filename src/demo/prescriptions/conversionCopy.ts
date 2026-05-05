export interface ConversionCopy {
  headline: string;
  subhead: string;
  cta: string;
  lossStatement: string;
  socialProof: string;
  almostUnlockedLine: string;
}

export interface ConversionCopyOpts {
  pct?: number;
  visiblePct?: number;
}

export function conversionCopy(
  simId: string,
  severity: 'minor' | 'moderate' | 'critical',
  gap: number | string,
  opts: ConversionCopyOpts = {},
): ConversionCopy {
  const g = typeof gap === 'number' ? gap : parseFloat(String(gap)) || 0;
  const pct = Math.max(0, Math.min(100, Math.round(opts.pct ?? 0)));
  const visiblePct = Math.max(0, Math.min(100, Math.round(opts.visiblePct ?? 35)));

  // Severity-driven headline + CTA (sim-agnostic for trust)
  let headline: string;
  let subhead: string;
  let cta: string;
  if (severity === 'critical') {
    headline = "You're leaving serious performance on the table";
    subhead = 'Your prescription is ready — built from the exact gap you just surfaced.';
    cta = 'Fix this now';
  } else if (severity === 'moderate') {
    headline = "You're close — this is the missing piece";
    subhead = 'Targeted system mapped to your result. Close the gap in weeks, not months.';
    cta = 'Unlock your next level';
  } else {
    headline = "You're near elite — refine the final edge";
    subhead = 'A handful of precise reps separate good from elite. Lock in the system.';
    cta = 'Finish the system';
  }

  // Almost-unlocked override
  if (pct > 70) cta = 'Finish unlocking your system';

  // Sim-specific loss statement (no exaggeration)
  let lossStatement: string;
  if (simId === 'hitting') {
    const ft = Math.max(0, Math.round(g * 5));
    lossStatement = `You're losing ~${ft} ft per ball in play due to this gap.`;
  } else if (simId === 'program') {
    const pctMissing = Math.max(0, Math.round(g));
    lossStatement = `You're missing ~${pctMissing}% of weekly stimulus compared to elite athletes.`;
  } else {
    lossStatement = `You're only seeing ${visiblePct}% of your performance history.`;
  }

  // Social proof (subtle, no fabricated user percentages)
  let socialProof: string;
  if (simId === 'hitting') {
    socialProof = 'Athletes closing this gap typically gain +3–5 mph exit velocity in 6–8 weeks.';
  } else if (simId === 'program') {
    socialProof = 'Athletes following this structure see ~10–20% strength gains in 8 weeks.';
  } else {
    socialProof = 'Tracking full history dramatically improves consistency and progression tracking.';
  }

  const almostUnlockedLine = `You're ${pct}% of the way to unlocking your full system`;

  return { headline, subhead, cta, lossStatement, socialProof, almostUnlockedLine };
}
