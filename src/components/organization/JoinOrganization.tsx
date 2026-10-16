import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Users, Loader2, Check } from 'lucide-react';

export function JoinOrganization() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<{ id: string; name: string; sport: string } | null>(null);

  const REASONS: Record<string, string> = {
    not_found: 'No team or organization uses that code.',
    not_verified: 'This organization can't add players right now. Ask its admin.',
    parent_required: 'A parent needs to join for you.',
  };

  const lookupCode = async () => {
    if (!code.trim() || !user) return;
    setLoading(true);
    try {
      // The code is checked on the server; organizations are not listed to players.
      const { data, error } = await supabase.rpc('join_by_invite_code', { _code: code.trim().toUpperCase() });
      if (error) throw error;
      const res = data as { ok: boolean; reason?: string; name?: string };
      if (!res?.ok) {
        toast({ title: 'Could not join', description: REASONS[res?.reason ?? ''] ?? 'Please check the code.', variant: 'destructive' });
        return;
      }
      setFound({ id: '', name: res.name ?? 'your team', sport: '' });
      toast({ title: 'Joined!', description: `You joined ${res.name ?? 'the team'}.` });
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
      queryClient.invalidateQueries({ queryKey: ['player-orgs'] });
      setCode('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const join = async () => { setFound(null); };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Join an Organization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {found ? (
          <div className="space-y-3">
            <div className="rounded-lg border bg-accent/20 p-4 text-center">
              <p className="font-semibold text-lg">{found.name}</p>
              <p className="text-sm text-muted-foreground capitalize">{found.sport}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setFound(null); setCode(''); }}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={join} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Enter invite code"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="font-mono tracking-wider text-center"
              maxLength={8}
            />
            <Button onClick={lookupCode} disabled={loading || !code.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
