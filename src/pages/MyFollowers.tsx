import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface Follower {
  id: string;
  scout_id: string;
  created_at: string;
  scout: {
    full_name: string;
    avatar_url: string | null;
  };
}

export default function MyFollowers() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading before redirecting
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate("/auth");
      return;
    }

    fetchFollowers();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to realtime updates for follow status changes
    const channel = supabase
      .channel('scout-follows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scout_follows',
          filter: `player_id=eq.${user.id}`,
        },
        () => {
          fetchFollowers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchFollowers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('scout_follows')
        .select(`
          id,
          scout_id,
          created_at,
          scout:profiles!scout_follows_scout_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .eq('player_id', user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFollowers(data || []);
    } catch (error) {
      console.error('Error fetching followers:', error);
      toast.error("Failed to load followers");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFollower = async (followId: string) => {
    try {
      const { error } = await supabase
        .from('scout_follows')
        .update({ status: 'rejected' })
        .eq('id', followId);

      if (error) throw error;

      toast.success("Scout access removed");
      fetchFollowers();
    } catch (error) {
      console.error('Error removing follower:', error);
      toast.error("Failed to remove scout access");
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading followers...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Followers</h1>
          <p className="text-muted-foreground">
            Manage scouts and coaches who have access to your training library
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Followers
              {followers.length > 0 && <Badge variant="secondary">{followers.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {followers.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground font-medium">No scouts following you yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  When scouts or coaches follow you, they'll appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {followers.map((follower) => (
                  <div
                    key={follower.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {follower.scout.avatar_url ? (
                        <img
                          src={follower.scout.avatar_url}
                          alt={follower.scout.full_name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserPlus className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{follower.scout.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Following since {new Date(follower.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/profile?userId=${follower.scout_id}`)}
                      >
                        View Profile
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveFollower(follower.id)}
                      >
                        Remove Access
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
