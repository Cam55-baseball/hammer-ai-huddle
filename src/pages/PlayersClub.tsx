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
import { Download, Edit, Share2, Trash2, LayoutGrid, LayoutList, BookMarked } from 'lucide-react';
import { toast } from 'sonner';
import { SessionDetailDialog } from '@/components/SessionDetailDialog';
import { Skeleton } from '@/components/ui/skeleton';
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
  library_title?: string;
  library_notes?: string;
  sport: string;
  module: string;
  efficiency_score?: number;
  session_date: string;
  shared_with_scouts: boolean;
  ai_analysis?: any;
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

  const filteredSessions = sessions.filter(session => {
    const matchesSport = sportFilter === 'all' || session.sport === sportFilter;
    const matchesModule = moduleFilter === 'all' || session.module === moduleFilter;
    const matchesSearch = !searchQuery || 
      session.library_title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSport && matchesModule && matchesSearch;
  });

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

          {/* View Mode Toggle */}
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
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sport" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              <SelectItem value="baseball">Baseball</SelectItem>
              <SelectItem value="softball">Softball</SelectItem>
            </SelectContent>
          </Select>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-40">
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
              <Card key={session.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  {/* Thumbnail */}
                  <div className="relative h-48 bg-muted">
                    {session.thumbnail_url ? (
                      <img src={session.thumbnail_url} alt="Session" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookMarked className="h-16 w-16 text-muted-foreground" />
                      </div>
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
    </DashboardLayout>
  );
}