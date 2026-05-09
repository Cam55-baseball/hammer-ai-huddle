import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import { VideoCard } from "@/components/video-library/VideoCard";
import { VideoSearchBar } from "@/components/video-library/VideoSearchBar";
import { VideoFilters } from "@/components/video-library/VideoFilters";
import { SavedVideos } from "@/components/video-library/SavedVideos";
import { FoundationsShelf } from "@/components/video-library/FoundationsShelf";
import { Skeleton } from "@/components/ui/skeleton";
import { useVideoLibrary, type LibraryVideo } from "@/hooks/useVideoLibrary";

const VideoLibrary = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [sort, setSort] = useState<'newest' | 'most_liked'>('newest');

  const { videos, tags, loading, hasMore, loadMore, toggleLike, trackView, trackSearch } = useVideoLibrary({
    search,
    sportFilter,
    categoryFilter,
    tagFilters,
    sort,
  });

  const handlePlay = useCallback((video: LibraryVideo) => {
    trackView(video.id);
    navigate(`/video-library/${video.id}`);
  }, [navigate, trackView]);

  const handleTagToggle = (tag: string) => {
    setTagFilters(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSportFilter([]);
    setCategoryFilter('');
    setTagFilters([]);
  };

  return (
    <SubscriptionGate requiredAccess="any" featureName="Video Library" featureDescription="Access our curated library of training videos.">
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Library className="h-6 w-6 text-primary" />
                Video Library
              </h1>
              <p className="text-sm text-muted-foreground">Search our curated training video collection</p>
            </div>
          </div>

          <FoundationsShelf />

          <VideoSearchBar onSearch={setSearch} onTrackSearch={trackSearch} />

          <Tabs defaultValue="browse">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <TabsList>
                <TabsTrigger value="browse">Browse</TabsTrigger>
                <TabsTrigger value="saved">Saved</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <Button variant={sort === 'newest' ? 'default' : 'outline'} size="sm" onClick={() => setSort('newest')}>
                  Newest
                </Button>
                <Button variant={sort === 'most_liked' ? 'default' : 'outline'} size="sm" onClick={() => setSort('most_liked')}>
                  Most Liked
                </Button>
              </div>
            </div>

            <TabsContent value="browse" className="space-y-4 mt-4">
              <VideoFilters
                tags={tags}
                sportFilter={sportFilter}
                categoryFilter={categoryFilter}
                tagFilters={tagFilters}
                onSportChange={setSportFilter}
                onCategoryChange={setCategoryFilter}
                onTagToggle={handleTagToggle}
                onClearAll={clearFilters}
              />

              {loading && videos.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="aspect-video w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center py-12">
                  <Library className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <h3 className="font-semibold text-lg mb-1">No videos found</h3>
                  <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {videos.map(video => (
                      <VideoCard key={video.id} video={video} onPlay={handlePlay} onLike={toggleLike} />
                    ))}
                  </div>
                  {hasMore && (
                    <div className="text-center pt-4">
                      <Button variant="outline" onClick={loadMore} disabled={loading}>
                        {loading ? 'Loading...' : 'Load More'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="saved" className="mt-4">
              <SavedVideos videos={videos} onPlay={handlePlay} onLike={toggleLike} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </SubscriptionGate>
  );
};

export default VideoLibrary;
