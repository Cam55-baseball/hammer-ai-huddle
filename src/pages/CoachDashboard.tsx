import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayerSearchFilters } from '@/components/PlayerSearchFilters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Check, Clock, BookMarked, User, UserMinus, Send } from 'lucide-react';
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

export default function CoachDashboard() {
  const { t } = useTranslation();
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

  // Check coach access
  const [hasCoachAccess, setHasCoachAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setCheckingAccess(false);
        return;
      }

      try {
        // Check if user has coach role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', user.id)
          .eq('role', 'coach')
          .eq('status', 'active')
          .maybeSingle();

        if (roleData) {
          setHasCoachAccess(true);
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
            // They might have been approved as a scout, not a coach
            // Redirect to scout dashboard or application
            navigate('/scout-dashboard');
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
        console.error('Error checking coach access:', error);
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
        title: t('common.error'),
        description: t('coach.failedToLoadPlayers', 'Failed to load your players'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && hasCoachAccess) {
      fetchFollowing();
    }
  }, [user, hasCoachAccess]);

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
            title: t('common.error'),
            description: t('coach.failedToSearchPlayers', 'Failed to search players'),
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
        title: t('coach.followRequestSent', 'Follow request sent'),
        description: t('coach.followRequestSentDescription', 'The player will receive your request.'),
      });

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
        title: t('common.error'),
        description: error.message || t('coach.failedToSendFollow', 'Failed to send follow request'),
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
        title: t('coach.unfollowedPlayer', 'Player removed'),
        description: t('coach.unfollowedPlayerDescription', '{{name}} has been removed from your players.', { name: playerToUnfollow.full_name }),
      });
      
      await fetchFollowing();
      
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
        title: t('common.error'),
        description: error.message || t('coach.failedToUnfollow', 'Failed to remove player'),
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8" />
            {t('coach.dashboard', 'Coach Dashboard')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('coach.dashboardDescription', 'Manage your players and send them training activities')}
          </p>
        </div>

        <Tabs value={sportFilter} onValueChange={(value) => setSportFilter(value as 'all' | 'baseball' | 'softball')} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mx-auto">
            <TabsTrigger value="all">{t('common.allSports')}</TabsTrigger>
            <TabsTrigger value="baseball">{t('dashboard.baseball')}</TabsTrigger>
            <TabsTrigger value="softball">{t('dashboard.softball')}</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('coach.myPlayers', 'My Players')}</span>
              <Badge variant="secondary">{followingCount}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(loading || ownerLoading) ? (
              <p className="text-center text-muted-foreground py-8">{t('common.loading')}</p>
            ) : following.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t('coach.noPlayers', 'You haven\'t added any players yet. Search below to find and add players.')}
              </p>
            ) : (
              <div className="space-y-3">
                {following.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors flex-wrap"
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
                            <GraduationCap className="h-6 w-6 text-primary" />
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
                        <span className="hidden sm:inline">{t('coach.viewProfile', 'View Profile')}</span>
                      </Button>
                      <Button
                        onClick={() => navigate(`/players-club?playerId=${player.id}`)}
                        size="sm"
                        variant="outline"
                        className="flex-shrink-0"
                      >
                        <BookMarked className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">{t('coach.viewLibrary', 'View Library')}</span>
                      </Button>
                      <Button
                        onClick={() => navigate('/my-custom-activities?tab=templates')}
                        size="sm"
                        variant="default"
                        className="flex-shrink-0"
                      >
                        <Send className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">{t('coach.sendActivity', 'Send Activity')}</span>
                      </Button>
                      {player.id !== ownerId && (
                        <Button
                          onClick={() => handleUnfollowClick(player)}
                          size="sm"
                          variant="destructive"
                          className="flex-shrink-0"
                        >
                          <UserMinus className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">{t('coach.remove', 'Remove')}</span>
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
            <CardTitle>{t('coach.findPlayers', 'Find Players')}</CardTitle>
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
                  placeholder={t('coach.searchPlayersPlaceholder', 'Search players by name...')}
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandList>
                  <CommandEmpty>
                    {searchTerm.trim().length < 2 
                      ? t('coach.minCharactersToSearch', 'Type at least 2 characters to search')
                      : searchLoading 
                      ? t('common.searching')
                      : t('coach.noPlayersFound', 'No players found')}
                  </CommandEmpty>
                  <CommandGroup heading={t('coach.players', 'Players')}>
                    {searchResults.map((player) => (
                      <CommandItem
                        key={player.id}
                        value={player.full_name}
                        className="flex items-center justify-between p-3"
                      >
                        <div className="flex items-center gap-3">
                          {player.avatar_url ? (
                            <img
                              src={player.avatar_url}
                              alt={player.full_name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <GraduationCap className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <span className="font-medium">{player.full_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {player.followStatus === 'accepted' ? (
                            <Badge variant="secondary" className="gap-1">
                              <Check className="h-3 w-3" />
                              {t('coach.following', 'Following')}
                            </Badge>
                          ) : player.followStatus === 'pending' ? (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-3 w-3" />
                              {t('coach.pending', 'Pending')}
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendFollow(player.id);
                              }}
                            >
                              <GraduationCap className="h-4 w-4 mr-1" />
                              {t('coach.addPlayer', 'Add Player')}
                            </Button>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={unfollowDialogOpen} onOpenChange={setUnfollowDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('coach.removePlayer', 'Remove Player')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('coach.removePlayerConfirmation', 'Are you sure you want to remove {{name}} from your players?', { name: playerToUnfollow?.full_name || '' })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isUnfollowing}>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmUnfollow}
                disabled={isUnfollowing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isUnfollowing ? t('common.loading') : t('coach.remove', 'Remove')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
