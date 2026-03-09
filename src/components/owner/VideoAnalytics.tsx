import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Heart, Eye, Search } from "lucide-react";
import { useVideoLibraryAdmin } from "@/hooks/useVideoLibraryAdmin";

interface AnalyticsData {
  mostLiked: { id: string; title: string; likes_count: number; views_count: number }[];
  topSearches: { term: string; count: number }[];
  totalViews: number;
}

export function VideoAnalytics() {
  const { fetchAnalytics } = useVideoLibraryAdmin();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics().then(d => {
      setData(d);
      setLoading(false);
    });
  }, [fetchAnalytics]);

  if (loading || !data) {
    return <p className="text-muted-foreground text-center py-8">Loading analytics...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <Eye className="h-6 w-6 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold">{data.totalViews}</p>
          <p className="text-xs text-muted-foreground">Total Views</p>
        </Card>
        <Card className="p-4 text-center">
          <Heart className="h-6 w-6 mx-auto mb-2 text-destructive" />
          <p className="text-2xl font-bold">{data.mostLiked.reduce((s, v) => s + v.likes_count, 0)}</p>
          <p className="text-xs text-muted-foreground">Total Likes</p>
        </Card>
        <Card className="p-4 text-center">
          <Search className="h-6 w-6 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold">{data.topSearches.length}</p>
          <p className="text-xs text-muted-foreground">Unique Searches</p>
        </Card>
      </div>

      <Card className="p-4">
        <h4 className="font-semibold mb-3">Most Liked Videos</h4>
        <div className="space-y-2">
          {data.mostLiked.slice(0, 10).map((v, i) => (
            <div key={v.id} className="flex items-center justify-between text-sm">
              <span className="truncate flex-1">
                <span className="text-muted-foreground mr-2">{i + 1}.</span>
                {v.title}
              </span>
              <span className="text-muted-foreground shrink-0 ml-2">❤️ {v.likes_count}</span>
            </div>
          ))}
          {data.mostLiked.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="font-semibold mb-3">Top Search Keywords</h4>
        <div className="space-y-2">
          {data.topSearches.slice(0, 15).map((s, i) => (
            <div key={s.term} className="flex items-center justify-between text-sm">
              <span>
                <span className="text-muted-foreground mr-2">{i + 1}.</span>
                "{s.term}"
              </span>
              <span className="text-muted-foreground">{s.count} searches</span>
            </div>
          ))}
          {data.topSearches.length === 0 && <p className="text-sm text-muted-foreground">No searches yet.</p>}
        </div>
      </Card>
    </div>
  );
}
