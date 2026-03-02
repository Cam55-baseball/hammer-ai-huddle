import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, UserPlus, Loader2 } from 'lucide-react';

interface CoachResult {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface CoachSearchConnectProps {
  onRequestSent: () => void;
}

export function CoachSearchConnect({ onRequestSent }: CoachSearchConnectProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CoachResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim() || query.length < 2) return;
    setSearching(true);
    try {
      // Find users with coach role
      const { data: coachRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'coach')
        .eq('status', 'active');

      if (!coachRoles || coachRoles.length === 0) {
        setResults([]);
        return;
      }

      const coachIds = coachRoles.map(r => r.user_id).filter(id => id !== user?.id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', coachIds)
        .ilike('full_name', `%${query}%`)
        .limit(10);

      setResults(profiles ?? []);
    } catch {
      toast({ title: 'Search failed', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (coachId: string) => {
    setSending(coachId);
    try {
      const { error } = await supabase
        .from('scout_follows')
        .insert({
          scout_id: coachId,
          player_id: user!.id,
          status: 'pending',
          initiated_by: 'player',
          relationship_type: 'linked',
        });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Request already exists', variant: 'destructive' });
        } else {
          throw error;
        }
      } else {
        toast({ title: 'Link request sent!' });
        onRequestSent();
      }
    } catch {
      toast({ title: 'Failed to send request', variant: 'destructive' });
    } finally {
      setSending(null);
    }
  };

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Search coaches by name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="h-9 text-sm"
          />
          <Button size="sm" onClick={handleSearch} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map(coach => (
              <div key={coach.id} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-2">
                  {coach.avatar_url ? (
                    <img src={coach.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {coach.full_name?.charAt(0) ?? '?'}
                    </div>
                  )}
                  <span className="text-sm font-medium">{coach.full_name}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => sendRequest(coach.id)}
                  disabled={sending === coach.id}
                >
                  {sending === coach.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <><UserPlus className="h-3.5 w-3.5 mr-1" /> Link</>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && query.length >= 2 && !searching && (
          <p className="text-xs text-muted-foreground text-center py-2">No coaches found</p>
        )}
      </CardContent>
    </Card>
  );
}
