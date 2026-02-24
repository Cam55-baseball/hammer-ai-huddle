interface ProProbabilityCapProps {
  sport?: string;
}

export function ProProbabilityCap({ sport = 'baseball' }: ProProbabilityCapProps) {
  const label = sport === 'softball' ? 'Pre-AUSL' : 'Pre-MLB';
  return (
    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
      {label}
    </span>
  );
}
