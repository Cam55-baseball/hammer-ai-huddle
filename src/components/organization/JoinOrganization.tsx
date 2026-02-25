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

  const lookupCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, sport')
        .eq('invite_code', code.trim().toUpperCase())
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast({ title: 'Not found', description: 'No organization found with that code.', variant: 'destructive' });
        return;
      }
      setFound(data);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const join = async () => {
    if (!found || !user) return;
    setLoading(true);
    try {
      // Check if already a member
      const { data: existing } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', found.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (existing) {
        toast({ title: 'Already a member', description: 'You are already part of this organization.' });
        setCode('');
        setFound(null);
        return;
      }

      const { error } = await supabase.from('organization_members').insert({
        organization_id: found.id,
        user_id: user.id,
        role_in_org: 'player',
        invitation_status: 'active',
      });
      if (error) throw error;

      toast({ title: 'Joined!', description: `You joined ${found.name}.` });
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
      queryClient.invalidateQueries({ queryKey: ['player-orgs'] });
      setCode('');
      setFound(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

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
                Join
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Look Up'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
