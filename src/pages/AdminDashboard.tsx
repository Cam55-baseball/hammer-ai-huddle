import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/DashboardLayout';

interface Video {
  id: string;
  user_id: string;
  module: string;
  sport: string;
  status: string;
  efficiency_score: number | null;
  created_at: string;
}

interface TrainingData {
  id: string;
  title: string;
  sport: string;
  module: string;
  data_type: string;
  tags: string[];
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [trainingData, setTrainingData] = useState<TrainingData[]>([]);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        navigate('/');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error || !data) {
          toast({
            title: 'Access Denied',
            description: 'You do not have admin privileges.',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        setIsAdmin(true);
        await loadData();
      } catch (error) {
        console.error('Error checking admin role:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      const [videosResponse, trainingResponse] = await Promise.all([
        supabase.from('videos').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('training_data').select('*').order('created_at', { ascending: false }),
      ]);

      if (videosResponse.data) setVideos(videosResponse.data);
      if (trainingResponse.data) setTrainingData(trainingResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteTrainingData = async (id: string) => {
    try {
      const { error } = await supabase.from('training_data').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Training data deleted successfully',
      });

      await loadData();
    } catch (error) {
      console.error('Error deleting training data:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete training data',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage training data and monitor system activity</p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </div>

        <Tabs defaultValue="videos" className="space-y-6">
          <TabsList>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="training">Training Data</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Recent Videos</h2>
              <div className="space-y-2">
                {videos.length === 0 ? (
                  <p className="text-muted-foreground">No videos uploaded yet</p>
                ) : (
                  videos.map((video) => (
                    <div
                      key={video.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold capitalize">
                            {video.sport} - {video.module}
                          </p>
                          <p className="text-sm text-muted-foreground">Status: {video.status}</p>
                          {video.efficiency_score && (
                            <p className="text-sm">Score: {video.efficiency_score}/100</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(video.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Training Data Library</h2>
              <div className="space-y-2">
                {trainingData.length === 0 ? (
                  <p className="text-muted-foreground">No training data available</p>
                ) : (
                  trainingData.map((data) => (
                    <div
                      key={data.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold">{data.title}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {data.sport} - {data.module} - {data.data_type}
                          </p>
                          {data.tags && data.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {data.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteTrainingData(data.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Videos</h3>
                <p className="text-3xl font-bold">{videos.length}</p>
              </Card>
              <Card className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Training Data</h3>
                <p className="text-3xl font-bold">{trainingData.length}</p>
              </Card>
              <Card className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Avg Score</h3>
                <p className="text-3xl font-bold">
                  {videos.length > 0
                    ? Math.round(
                        videos
                          .filter((v) => v.efficiency_score)
                          .reduce((acc, v) => acc + (v.efficiency_score || 0), 0) /
                          videos.filter((v) => v.efficiency_score).length
                      )
                    : 0}
                </p>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
