import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RankingData {
  user_id: string;
  full_name: string;
  sport: string;
  module: string;
  videos_analyzed: number;
  last_activity: string;
}

interface RankingsTableProps {
  rankings: RankingData[];
  loading: boolean;
  currentUserId?: string;
}

export function RankingsTable({ rankings, loading, currentUserId }: RankingsTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Athlete</TableHead>
            <TableHead>Sport</TableHead>
            <TableHead>Module</TableHead>
            <TableHead className="text-right">Videos</TableHead>
            <TableHead className="text-right">Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No rankings data available
              </TableCell>
            </TableRow>
          ) : (
            rankings.map((ranking, index) => {
              const isCurrentUser = ranking.user_id === currentUserId;
              const rank = index + 1;
              
              return (
                <TableRow
                  key={ranking.user_id + ranking.module}
                  className={isCurrentUser ? "bg-accent/50" : ""}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {rank <= 3 && (
                        <Trophy
                          className={`h-4 w-4 ${
                            rank === 1
                              ? "text-yellow-500"
                              : rank === 2
                              ? "text-gray-400"
                              : "text-orange-600"
                          }`}
                        />
                      )}
                      {rank}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {ranking.full_name}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-primary">(You)</span>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{ranking.sport}</TableCell>
                  <TableCell className="capitalize">{ranking.module}</TableCell>
                  <TableCell className="text-right">{ranking.videos_analyzed}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">Active</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
