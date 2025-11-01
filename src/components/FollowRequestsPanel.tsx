import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, X, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FollowRequest {
  id: string;
  scout_id: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function FollowRequestsPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      // Step 1: Fetch follow requests
      const { data: followsData, error: followsError } = await supabase
        .from('scout_follows')
        .select('id, scout_id, status, created_at')
        .eq('player_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (followsError) throw followsError;
      
      if (!followsData || followsData.length === 0) {
        setRequests([]);
        return;
      }

      // Step 2: Fetch scout profiles
      const scoutIds = followsData.map(f => f.scout_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', scoutIds);

      if (profilesError) throw profilesError;

      // Step 3: Map profiles to follows
      const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      const formattedRequests = followsData.map(follow => ({
        ...follow,
        profiles: profileMap.get(follow.scout_id) || {
          full_name: 'Unknown Scout',
          avatar_url: null
        }
      }));

      setRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching follow requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    // Set up realtime subscription
    const channel = supabase
      .channel('scout-follows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scout_follows',
          filter: `player_id=eq.${user?.id}`
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleResponse = async (followId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase.functions.invoke('respond-to-follow', {
        body: { follow_id: followId, status }
      });

      if (error) throw error;

      toast({
        title: status === 'accepted' ? 'Follow request accepted' : 'Follow request rejected',
        description: `You have ${status} the follow request.`,
      });

      fetchRequests();
    } catch (error) {
      console.error('Error responding to follow:', error);
      toast({
        title: 'Error',
        description: 'Failed to respond to follow request',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return null;
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Scout/Coach Follow Requests
          <Badge variant="secondary">{requests.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {request.profiles.avatar_url ? (
                  <img
                    src={request.profiles.avatar_url}
                    alt={request.profiles.full_name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-semibold">{request.profiles.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Wants to follow you
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleResponse(request.id, 'accepted')}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleResponse(request.id, 'rejected')}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
