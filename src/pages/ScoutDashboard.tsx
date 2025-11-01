import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Check, Clock, BookMarked } from 'lucide-react';
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
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sportFilter, setSportFilter] = useState<'all' | 'baseball' | 'softball'>('all');

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

  const fetchPlayers = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .neq('id', user.id); // Exclude self

      if (profilesError) throw profilesError;

      // Get scout's follow statuses
      const { data: followsData } = await supabase
        .from('scout_follows')
        .select('player_id, status')
        .eq('scout_id', user.id);

      const followsMap = new Map(
        followsData?.map(f => [f.player_id, f.status]) || []
      );

      const playersWithStatus = profilesData.map(player => ({
        ...player,
        followStatus: followsMap.has(player.id) 
          ? followsMap.get(player.id) as 'pending' | 'accepted'
          : 'none' as const
      }));

      setPlayers(playersWithStatus);
      setFilteredPlayers(playersWithStatus);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast({
        title: 'Error',
        description: 'Failed to load players',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [user]);

  useEffect(() => {
    let filtered = players;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.full_name?.toLowerCase().includes(searchLower)
      );
      
      // Sort: names starting with search term come first
      filtered.sort((a, b) => {
        const aStarts = a.full_name?.toLowerCase().startsWith(searchLower);
        const bStarts = b.full_name?.toLowerCase().startsWith(searchLower);
        
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });
    }

    setFilteredPlayers(filtered);
  }, [searchTerm, players]);

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

      fetchPlayers();
    } catch (error: any) {
      console.error('Error sending follow:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send follow request',
        variant: 'destructive',
      });
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

  const followingPlayers = players.filter(p => p.followStatus === 'accepted');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Scout Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage your player follows and track their progress
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Following</span>
              <Badge variant="secondary">{followingPlayers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {followingPlayers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                You're not following any players yet. Use the Find Players section below to send follow requests.
              </p>
            ) : (
              <div className="space-y-3">
                {followingPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
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
                      <div>
                        <p className="font-semibold">{player.full_name}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate(`/players-club?playerId=${player.id}`)}
                      size="sm"
                      variant="outline"
                    >
                      <BookMarked className="h-4 w-4 mr-2" />
                      View Library
                    </Button>
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
              <Command className="rounded-lg border shadow-md">
                <CommandInput
                  placeholder="Search by player name..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandList>
                  <CommandEmpty>No players found</CommandEmpty>
                  <CommandGroup heading="Players">
                    {filteredPlayers.slice(0, 8).map((player) => (
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
                {filteredPlayers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No players found
                  </p>
                ) : (
                  filteredPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
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
                        <div>
                          <p className="font-semibold">{player.full_name}</p>
                        </div>
                      </div>

                      <div>
                        {player.followStatus === 'none' && (
                          <Button
                            onClick={() => handleSendFollow(player.id)}
                            size="sm"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Follow
                          </Button>
                        )}
                        {player.followStatus === 'pending' && (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                        {player.followStatus === 'accepted' && (
                          <div className="flex gap-2">
                            <Badge variant="default" className="gap-1">
                              <Check className="h-3 w-3" />
                              Following
                            </Badge>
                            <Button
                              onClick={() => navigate(`/players-club?playerId=${player.id}`)}
                              size="sm"
                              variant="outline"
                            >
                              <BookMarked className="h-4 w-4 mr-2" />
                              View Library
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
