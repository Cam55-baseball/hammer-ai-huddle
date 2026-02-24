import { cn } from '@/lib/utils';

interface VerifiedStatBadgeProps {
  status: string;
}

export function VerifiedStatBadge({ status }: VerifiedStatBadgeProps) {
  const config = {
    pending: { label: 'Pending', className: 'bg-amber-500/20 text-amber-700 border-amber-500/30' },
    verified: { label: 'Verified', className: 'bg-green-500/20 text-green-700 border-green-500/30' },
    rejected: { label: 'Rejected', className: 'bg-red-500/20 text-red-700 border-red-500/30' },
  }[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' };

  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}
