import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Edit, Share2, Trash2, LayoutGrid, LayoutList, BookMarked, BookmarkCheck, GitCompare, Check, Play } from 'lucide-react';
import { toast } from 'sonner';
import { SessionDetailDialog } from '@/components/SessionDetailDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoCardLazy } from '@/components/VideoCardLazy';
import { BlurhashImage } from '@/components/BlurhashImage';
import { VideoComparisonView } from '@/components/VideoComparisonView';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LibrarySession {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url?: string;
  thumbnail_webp_url?: string;
  thumbnail_sizes?: {
    small: string;
    medium: string;
    large: string;
  };
  blurhash?: string;
  library_title?: string;
  library_notes?: string;
  sport: string;
  module: string;
  efficiency_score?: number;
  session_date: string;
  shared_with_scouts: boolean;
  ai_analysis?: any;
  annotation_count?: Array<{ count: number }>;
}

export default function PlayersClub() {
  const { session, user } = useAuth();
  const { isOwner } = useOwnerAccess();
  const [searchParams] = useSearchParams();
  const viewingPlayerId = searchParams.get('playerId');

  const [sessions, setSessions] = useState<LibrarySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState<LibrarySession | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [showComparisonView, setShowComparisonView] = useState(false);

  useEffect(() => {
    if (session) {
      fetchLibrary();
      if (viewingPlayerId) {
        fetchPlayerName();
      }
    }
  }, [session, viewingPlayerId]);

  const fetchPlayerName = async () => {
    if (!viewingPlayerId) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', viewingPlayerId)
      .single();
    
    if (data) {
      setPlayerName(data.full_name || 'Unknown Player');
    }
  };

  const fetchLibrary = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-player-library', {
        body: { playerId: viewingPlayerId }
      });

      if (error) throw error;

      setSessions(data || []);
    } catch (error: any) {
      console.error('Error fetching library:', error);
      toast.error(error.message || 'Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('download-session-video', {
        body: { sessionId }
      });

      if (error) throw error;

      if (data?.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
        toast.success('Download started');
      }
    } catch (error: any) {
      console.error('Error downloading:', error);
      toast.error(error.message || 'Failed to download video');
    }
  };

  const handleDelete = async (hardDelete: boolean = false) => {
    if (!sessionToDelete) return;

    try {
      const { error } = await supabase.functions.invoke('delete-library-session', {
        body: { sessionId: sessionToDelete, deleteFromStorage: hardDelete }
      });

      if (error) throw error;

      toast.success(hardDelete ? 'Session deleted permanently' : 'Session removed from library');
      fetchLibrary();
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast.error(error.message || 'Failed to delete session');
    } finally {
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    }
  };

  const handleToggleShare = async (sessionId: string, currentSharedStatus: boolean) => {
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      const { error } = await supabase.functions.invoke('update-library-session', {
        body: {
          sessionId,
          title: session.library_title,
          notes: session.library_notes,
          sharedWithScouts: !currentSharedStatus
        }
      });

      if (error) throw error;

      toast.success(!currentSharedStatus ? 'Shared with scouts' : 'Unshared from scouts');
      fetchLibrary();
    } catch (error: any) {
      console.error('Error toggling share:', error);
      toast.error(error.message || 'Failed to update sharing');
    }
  };

  const toggleCompareMode = () => {
    if (compareMode) {
      // Exiting compare mode - reset selections
      setSelectedForComparison([]);
    }
    setCompareMode(!compareMode);
  };

  const handleVideoSelect = (sessionId: string) => {
    if (!compareMode) return;
    
    setSelectedForComparison(prev => {
      if (prev.includes(sessionId)) {
        // Deselect
        return prev.filter(id => id !== sessionId);
      } else if (prev.length < 2) {
        // Select (max 2)
        return [...prev, sessionId];
      }
      return prev;
    });
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSport = sportFilter === 'all' || session.sport === sportFilter;
    const matchesModule = moduleFilter === 'all' || session.module === moduleFilter;
    const matchesSearch = !searchQuery || 
      session.library_title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSport && matchesModule && matchesSearch;
  });

  const getAnnotationCount = (session: LibrarySession) => {
    if (!session.annotation_count || !Array.isArray(session.annotation_count)) return 0;
    return session.annotation_count[0]?.count || 0;
  };

  const isOwnLibrary = !viewingPlayerId || viewingPlayerId === user?.id;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookMarked className="h-8 w-8" />
              {viewingPlayerId && playerName ? `${playerName}'s Library` : 'Players Club'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isOwnLibrary 
                ? 'Your personal training session library' 
                : 'View shared training sessions'}
            </p>
          </div>

          {/* View Mode Toggle and Compare Button */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            {isOwnLibrary && filteredSessions.length >= 2 && (
              <Button
                variant={compareMode ? 'default' : 'outline'}
                onClick={toggleCompareMode}
                className="gap-2"
              >
                <GitCompare className="h-4 w-4" />
                <span className="hidden sm:inline">{compareMode ? 'Cancel' : 'Compare'}</span>
              </Button>
            )}
            {compareMode && selectedForComparison.length === 2 && (
              <Button onClick={() => setShowComparisonView(true)} className="gap-2">
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Compare Selected</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-center">
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:max-w-xs"
          />
          
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Sport" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              <SelectItem value="baseball">Baseball</SelectItem>
              <SelectItem value="softball">Softball</SelectItem>
            </SelectContent>
          </Select>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              <SelectItem value="hitting">Hitting</SelectItem>
              <SelectItem value="pitching">Pitching</SelectItem>
              <SelectItem value="throwing">Throwing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sessions Grid/List */}
        {loading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookMarked className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No sessions found</h3>
              <p className="text-muted-foreground text-center">
                {isOwnLibrary 
                  ? 'Start analyzing videos and save them to your Players Club!' 
                  : 'This player hasn\'t shared any sessions yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            {filteredSessions.map((session) => (
              <VideoCardLazy key={session.id}>
                {viewMode === 'list' ? (
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-row">
                    <CardContent className="p-0 flex flex-row w-full">
                      {/* Thumbnail - Fixed width for list view */}
                      <div className="relative w-32 sm:w-40 h-24 sm:h-28 flex-shrink-0 bg-muted">
                        {/* Selection indicator for compare mode */}
                        {compareMode && (
                          <div
                            className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all z-10 ${
                              selectedForComparison.includes(session.id)
                                ? 'bg-primary border-primary'
                                : selectedForComparison.length >= 2
                                  ? 'border-white/50 bg-white/20'
                                  : 'border-white bg-white/80 hover:bg-white'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVideoSelect(session.id);
                            }}
                          >
                            {selectedForComparison.includes(session.id) && (
                              <Check className="h-4 w-4 text-white" />
                            )}
                          </div>
                        )}
                        {session.blurhash && (session.thumbnail_webp_url || session.thumbnail_url) ? (
                          <BlurhashImage
                            blurhash={session.blurhash}
                            src={session.thumbnail_webp_url || session.thumbnail_url!}
                            alt="Session thumbnail"
                            className="w-full h-full object-cover"
                          />
                        ) : session.thumbnail_url ? (
                          <img 
                            src={session.thumbnail_url} 
                            alt="Session thumbnail"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <BookMarked className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Content - Horizontal layout */}
                      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-base sm:text-lg line-clamp-1">
                            {session.library_title || 'Untitled Session'}
                          </h3>
                          <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
                            <Badge variant="outline" className="capitalize text-xs">
                              {session.sport}
                            </Badge>
                            <Badge variant="outline" className="capitalize text-xs">
                              {session.module}
                            </Badge>
                            {session.efficiency_score !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                {session.efficiency_score}%
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(session.session_date).toLocaleDateString()}
                          </span>
                          {isOwnLibrary && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSession(session);
                                }}
                                className="h-8 px-2"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(session.id);
                                }}
                                className="h-8 px-2"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                    {/* Thumbnail with responsive images and blurhash */}
                    <div className="relative h-48 bg-muted">
                      {/* Selection indicator for compare mode */}
                      {compareMode && (
                        <div
                          className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all z-10 ${
                            selectedForComparison.includes(session.id)
                              ? 'bg-primary border-primary'
                              : selectedForComparison.length >= 2
                                ? 'border-white/50 bg-white/20'
                                : 'border-white bg-white/80 hover:bg-white'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVideoSelect(session.id);
                          }}
                        >
                          {selectedForComparison.includes(session.id) && (
                            <Check className="h-4 w-4 text-white" />
                          )}
                        </div>
                      )}
                      {session.blurhash && (session.thumbnail_webp_url || session.thumbnail_url) ? (
                        <BlurhashImage
                          blurhash={session.blurhash}
                          src={session.thumbnail_webp_url || session.thumbnail_url!}
                          alt="Session thumbnail"
                          className="w-full h-full object-cover"
                        />
                      ) : session.thumbnail_sizes || session.thumbnail_webp_url ? (
                        <picture>
                          {/* Load appropriate size based on viewport */}
                          {session.thumbnail_sizes?.small && (
                            <source
                              media="(max-width: 640px)"
                              srcSet={session.thumbnail_sizes.small}
                              type="image/webp"
                            />
                          )}
                          {session.thumbnail_sizes?.medium && (
                            <source
                              media="(max-width: 1024px)"
                              srcSet={session.thumbnail_sizes.medium}
                              type="image/webp"
                            />
                          )}
                          {session.thumbnail_sizes?.large && (
                            <source
                              srcSet={session.thumbnail_sizes.large}
                              type="image/webp"
                            />
                          )}
                          {/* Fallback for browsers without WebP support */}
                          <img
                            src={session.thumbnail_url || session.thumbnail_webp_url}
                            alt="Session"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </picture>
                      ) : session.thumbnail_url ? (
                        <img src={session.thumbnail_url} alt="Session" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookMarked className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}
                      {/* Annotation indicator */}
                      {getAnnotationCount(session) > 0 && (
                        <Badge className="absolute top-2 left-2 bg-green-500 hover:bg-green-600">
                          <BookmarkCheck className="h-3 w-3 mr-1" />
                          Annotated
                        </Badge>
                      )}
                      {session.shared_with_scouts && (
                        <Badge className="absolute top-2 right-2" variant="secondary">
                          <Share2 className="h-3 w-3 mr-1" />
                          Shared
                        </Badge>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold line-clamp-1">
                          {session.library_title || `${session.sport} ${session.module}`}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.session_date).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Badge variant="outline">{session.sport}</Badge>
                        <Badge variant="outline">{session.module}</Badge>
                        {session.efficiency_score !== undefined && (
                          <Badge>{session.efficiency_score}%</Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedSession(session)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(session.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {isOwnLibrary && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleShare(session.id, session.shared_with_scouts)}
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSessionToDelete(session.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )}
              </VideoCardLazy>
            ))}
          </div>
        )}
      </div>

      {/* Session Detail Dialog */}
      {selectedSession && (
        <SessionDetailDialog
          session={selectedSession}
          open={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          onUpdate={fetchLibrary}
          isOwner={isOwnLibrary || isOwner}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to remove this session from your library or delete it permanently?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(false)}>
              Remove from Library
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleDelete(true)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Video Comparison View */}
      {showComparisonView && selectedForComparison.length === 2 && (
        <VideoComparisonView
          video1={filteredSessions.find(s => s.id === selectedForComparison[0])!}
          video2={filteredSessions.find(s => s.id === selectedForComparison[1])!}
          open={showComparisonView}
          onClose={() => {
            setShowComparisonView(false);
            setSelectedForComparison([]);
            setCompareMode(false);
          }}
        />
      )}
    </DashboardLayout>
  );
}