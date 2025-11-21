import { useState, useEffect } from 'react';
import { PlayerSearchFilters } from '@/components/PlayerSearchFilters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Check, Clock, BookMarked, User, UserMinus } from 'lucide-react';
import { ProfileCardSkeleton } from '@/components/skeletons/ProfileCardSkeleton';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Player {
  id: string;
  full_name: string;
  avatar_url: string | null;
  followStatus?: 'none' | 'pending' | 'accepted';
}

export default function ScoutDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [following, setFollowing] = useState<Player[]>([]);
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sportFilter, setSportFilter] = useState<'all' | 'baseball' | 'softball'>('all');
  const [unfollowDialogOpen, setUnfollowDialogOpen] = useState(false);
  const [playerToUnfollow, setPlayerToUnfollow] = useState<Player | null>(null);
  const [isUnfollowing, setIsUnfollowing] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [ownerLoading, setOwnerLoading] = useState(true);
  const [filters, setFilters] = useState({
    positions: [] as string[],
    throwingHands: [] as string[],
    battingSides: [] as string[],
    heightMin: '',
    heightMax: '',
    weightMin: '',
    weightMax: '',
    state: '',
    commitmentStatus: '',
    hsGradYearMin: '',
    hsGradYearMax: '',
    collegeGradYearMin: '',
    collegeGradYearMax: '',
    enrolledInCollege: null as boolean | null,
    isProfessional: null as boolean | null,
    isFreeAgent: null as boolean | null,
    mlbAffiliate: '',
    independentLeague: '',
    isForeignPlayer: null as boolean | null,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  // Auto-create scout role if it doesn't exist
  const [hasScoutAccess, setHasScoutAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setCheckingAccess(false);
        return;
      }

      try {
        // Check if user has scout role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', user.id)
          .eq('role', 'scout')
          .eq('status', 'active')
          .maybeSingle();

        if (roleData) {
          setHasScoutAccess(true);
          setCheckingAccess(false);
          return;
        }

        // Check application status
        const { data: appData } = await supabase
          .from('scout_applications')
          .select('status')
          .eq('user_id', user.id)
          .maybeSingle();

        if (appData) {
          if (appData.status === 'approved') {
            setHasScoutAccess(true);
          } else if (appData.status === 'pending') {
            navigate('/scout-application-pending');
          } else {
            navigate('/scout-application');
          }
        } else {
          // No application, redirect to apply
          navigate('/scout-application');
        }
      } catch (error) {
        console.error('Error checking scout access:', error);
        navigate('/scout-application');
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [user, navigate]);

  const fetchFollowing = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('get-following-players');

      if (error) {
        console.error('Error fetching following:', error);
        throw error;
      }

      setFollowing(data?.results || []);
    } catch (error) {
      console.error('Error in fetchFollowing:', error);
      toast({
        title: "Error",
        description: "Failed to load following players",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && hasScoutAccess) {
      fetchFollowing();
    }
  }, [user, hasScoutAccess]);

  // Fetch owner ID
  useEffect(() => {
    const fetchOwnerId = async () => {
      setOwnerLoading(true);
      const { data } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'owner')
        .maybeSingle();
      if (data) setOwnerId(data.user_id);
      setOwnerLoading(false);
    };
    fetchOwnerId();
  }, []);

  // Debounced search effect with filters
  useEffect(() => {
    // Check if we have search term or active filters
    const hasActiveFilters = 
      filters.positions.length > 0 ||
      filters.throwingHands.length > 0 ||
      filters.battingSides.length > 0 ||
      filters.heightMin || filters.heightMax ||
      filters.weightMin || filters.weightMax ||
      filters.state ||
      filters.commitmentStatus ||
      filters.hsGradYearMin || filters.hsGradYearMax ||
      filters.collegeGradYearMin || filters.collegeGradYearMax ||
      filters.enrolledInCollege !== null ||
      filters.isProfessional !== null ||
      filters.isFreeAgent !== null ||
      filters.mlbAffiliate ||
      filters.independentLeague ||
      filters.isForeignPlayer !== null;

    if (searchTerm.trim().length >= 2 || hasActiveFilters) {
      setSearchLoading(true);
      const timer = setTimeout(async () => {
        try {
          const { data, error } = await supabase.functions.invoke('search-players', {
            body: { 
              query: searchTerm,
              positions: filters.positions.length > 0 ? filters.positions : undefined,
              throwingHands: filters.throwingHands.length > 0 ? filters.throwingHands : undefined,
              battingSides: filters.battingSides.length > 0 ? filters.battingSides : undefined,
              heightMin: filters.heightMin || undefined,
              heightMax: filters.heightMax || undefined,
              weightMin: filters.weightMin || undefined,
              weightMax: filters.weightMax || undefined,
              state: filters.state || undefined,
              commitmentStatus: filters.commitmentStatus || undefined,
              hsGradYearMin: filters.hsGradYearMin || undefined,
              hsGradYearMax: filters.hsGradYearMax || undefined,
              collegeGradYearMin: filters.collegeGradYearMin || undefined,
              collegeGradYearMax: filters.collegeGradYearMax || undefined,
              enrolledInCollege: filters.enrolledInCollege !== null ? filters.enrolledInCollege : undefined,
              isProfessional: filters.isProfessional !== null ? filters.isProfessional : undefined,
              isFreeAgent: filters.isFreeAgent !== null ? filters.isFreeAgent : undefined,
              mlbAffiliate: filters.mlbAffiliate || undefined,
              independentLeague: filters.independentLeague || undefined,
              isForeignPlayer: filters.isForeignPlayer !== null ? filters.isForeignPlayer : undefined,
            }
          });

          if (error) {
            console.error('Error searching players:', error);
            throw error;
          }

          setSearchResults(data?.results || []);
        } catch (error) {
          console.error('Search error:', error);
          toast({
            title: "Error",
            description: "Failed to search players",
            variant: "destructive",
          });
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setSearchLoading(false);
    }
  }, [searchTerm, filters]);

  const handleSendFollow = async (playerId: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-follow-request', {
        body: { player_id: playerId }
      });

      if (error) throw error;

      toast({
        title: 'Follow request sent',
        description: 'The player will be notified of your request.',
      });

      // Refresh following list and search results
      fetchFollowing();
      if (searchTerm.trim().length >= 2) {
        const { data } = await supabase.functions.invoke('search-players', {
          body: { query: searchTerm }
        });
        setSearchResults(data?.results || []);
      }
    } catch (error: any) {
      console.error('Error sending follow:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send follow request',
        variant: 'destructive',
      });
    }
  };

  const handleUnfollowClick = (player: Player) => {
    setPlayerToUnfollow(player);
    setUnfollowDialogOpen(true);
  };

  const handleConfirmUnfollow = async () => {
    if (!playerToUnfollow) return;
    
    setIsUnfollowing(true);
    try {
      const { error } = await supabase.functions.invoke('unfollow-player', {
        body: { playerId: playerToUnfollow.id }
      });

      if (error) throw error;

      toast({
        title: 'Unfollowed player',
        description: `You have unfollowed ${playerToUnfollow.full_name}`,
      });
      
      // Refresh the following list
      await fetchFollowing();
      
      // Refresh search results if searching
      if (searchTerm.trim().length >= 2) {
        const { data } = await supabase.functions.invoke('search-players', {
          body: { query: searchTerm }
        });
        setSearchResults(data?.results || []);
      }
      
      setUnfollowDialogOpen(false);
      setPlayerToUnfollow(null);
    } catch (error: any) {
      console.error('Error unfollowing player:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to unfollow player',
        variant: 'destructive',
      });
    } finally {
      setIsUnfollowing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const followingCount = following.length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Scout Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage your player follows and track their progress
        </p>
      </div>

      <Tabs value={sportFilter} onValueChange={(value) => setSportFilter(value as 'all' | 'baseball' | 'softball')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mx-auto">
          <TabsTrigger value="all">All Sports</TabsTrigger>
          <TabsTrigger value="baseball">Baseball</TabsTrigger>
          <TabsTrigger value="softball">Softball</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Following</span>
              <Badge variant="secondary">{followingCount}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(loading || ownerLoading) ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : following.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                You're not following any players yet. Use the Find Players section below to send follow requests.
              </p>
            ) : (
              <div className="space-y-3">
                {following.map((player) => (
                  <div
                    key={player.id}
                    className="player-profiles flex items-center justify-between gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors flex-wrap"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        {player.avatar_url ? (
                          <img
                            src={player.avatar_url}
                            alt={player.full_name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserPlus className="h-6 w-6 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{player.full_name}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Button
                        onClick={() => navigate(`/profile?userId=${player.id}`)}
                        size="sm"
                        variant="outline"
                        className="flex-shrink-0"
                      >
                        <User className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">View Profile</span>
                      </Button>
                      <Button
                        onClick={() => navigate(`/players-club?playerId=${player.id}`)}
                        size="sm"
                        variant="outline"
                        className="flex-shrink-0"
                      >
                        <BookMarked className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">View Library</span>
                      </Button>
                      {player.id !== ownerId && (
                        <Button
                          onClick={() => handleUnfollowClick(player)}
                          size="sm"
                          variant="destructive"
                          className="follow-button flex-shrink-0"
                        >
                          <UserMinus className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Unfollow</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Find Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <PlayerSearchFilters
                filters={filters}
                sportFilter={sportFilter}
                onFilterChange={setFilters}
                onClearFilters={() => setFilters({
                  positions: [],
                  throwingHands: [],
                  battingSides: [],
                  heightMin: '',
                  heightMax: '',
                  weightMin: '',
                  weightMax: '',
                  state: '',
                  commitmentStatus: '',
                  hsGradYearMin: '',
                  hsGradYearMax: '',
                  collegeGradYearMin: '',
                  collegeGradYearMax: '',
                  enrolledInCollege: null,
                  isProfessional: null,
                  isFreeAgent: null,
                  mlbAffiliate: '',
                  independentLeague: '',
                  isForeignPlayer: null,
                })}
              />
              
              <Command className="rounded-lg border shadow-md">
                <CommandInput
                  placeholder="Search across all players (min 2 characters)..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandList>
                  <CommandEmpty>
                    {searchTerm.trim().length < 2 
                      ? "Type at least 2 characters to search" 
                      : searchLoading 
                      ? "Searching..." 
                      : "No players found"}
                  </CommandEmpty>
                  <CommandGroup heading="Players">
                    {searchResults.slice(0, 8).map((player) => (
                      <CommandItem
                        key={player.id}
                        value={player.full_name}
                        onSelect={() => {
                          setSearchTerm(player.full_name);
                        }}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        {player.avatar_url ? (
                          <img
                            src={player.avatar_url}
                            alt={player.full_name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserPlus className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <span>{player.full_name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {searchLoading ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <ProfileCardSkeleton />
                    <ProfileCardSkeleton />
                  </div>
                ) : searchTerm.trim().length < 2 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Type at least 2 characters to search across all players</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No players found
                  </p>
                ) : (
                  <>
                    {searchTerm && (
                      <p className="text-sm text-muted-foreground px-2">
                        {searchResults.length} {searchResults.length === 1 ? 'player' : 'players'} found
                      </p>
                    )}
                    {searchResults.map((player) => (
                    <div
                      key={player.id}
                      className="player-profiles flex items-center justify-between gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors flex-wrap"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          {player.avatar_url ? (
                            <img
                              src={player.avatar_url}
                              alt={player.full_name}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <UserPlus className="h-6 w-6 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{player.full_name}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center">
                        <Button
                          onClick={() => navigate(`/profile?userId=${player.id}`)}
                          size="sm"
                          variant="outline"
                          className="flex-shrink-0"
                        >
                          <User className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">View Profile</span>
                        </Button>
                        
                        {player.followStatus === 'accepted' && (
                          <Button
                            onClick={() => navigate(`/players-club?playerId=${player.id}`)}
                            size="sm"
                            variant="outline"
                            className="flex-shrink-0"
                          >
                            <BookMarked className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">View Library</span>
                          </Button>
                        )}
                        
                        {player.followStatus === 'none' && (
                          <Button
                            onClick={() => handleSendFollow(player.id)}
                            size="sm"
                            className="follow-button flex-shrink-0"
                          >
                            <UserPlus className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Follow</span>
                          </Button>
                        )}
                        {player.followStatus === 'pending' && (
                          <Badge variant="secondary" className="gap-1 flex-shrink-0">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                        {player.followStatus === 'accepted' && (
                          <Badge variant="default" className="gap-1 flex-shrink-0">
                            <Check className="h-3 w-3" />
                            Following
                          </Badge>
                        )}
                      </div>
                    </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unfollow Confirmation Dialog */}
      <AlertDialog open={unfollowDialogOpen} onOpenChange={setUnfollowDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unfollow Player</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unfollow {playerToUnfollow?.full_name}? You will lose access to their library and profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnfollowing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmUnfollow}
              disabled={isUnfollowing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUnfollowing ? "Unfollowing..." : "Unfollow"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
