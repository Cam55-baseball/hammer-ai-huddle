import { usePublicVerifiedStats } from '@/hooks/useVerifiedStats';
import { verifiedStatBoosts } from '@/data/verifiedStatBoosts';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PublicVerifiedStatsProps {
  userId: string;
}

export function PublicVerifiedStats({ userId }: PublicVerifiedStatsProps) {
  const { data: stats, isLoading } = usePublicVerifiedStats(userId);

  if (isLoading || !stats?.length) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-1.5">
        <ShieldCheck className="h-4 w-4 text-primary" />
        Verified Stats
      </h4>
      <div className="space-y-1.5">
        {stats.map((stat: any) => {
          const boost = verifiedStatBoosts[stat.profile_type];
          return (
            <a
              key={stat.id}
              href={stat.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-md border p-2 text-xs hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                <div>
                  <span className="font-medium">{stat.league}</span>
                  {stat.team_name && (
                    <span className="text-muted-foreground"> — {stat.team_name}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] capitalize">{stat.sport}</Badge>
                {stat.confidence_weight != null && (
                  <span className="text-[10px] text-muted-foreground">{stat.confidence_weight}%</span>
                )}
                {stat.verified_at && (
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(stat.verified_at).toLocaleDateString()}
                  </span>
                )}
                <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
