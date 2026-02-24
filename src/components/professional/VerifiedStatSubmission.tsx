import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVerifiedStats } from '@/hooks/useVerifiedStats';
import { VerifiedStatBadge } from './VerifiedStatBadge';
import { ExternalLink, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function VerifiedStatSubmission() {
  const { data: profiles, isLoading, submitProfile } = useVerifiedStats();
  const { toast } = useToast();
  const [sport, setSport] = useState('baseball');
  const [league, setLeague] = useState('');
  const [teamName, setTeamName] = useState('');
  const [profileUrl, setProfileUrl] = useState('');

  const handleSubmit = async () => {
    if (!league || !profileUrl) return;
    try {
      await submitProfile.mutateAsync({ sport, league, team_name: teamName || undefined, profile_url: profileUrl });
      toast({ title: 'Submitted', description: 'Your stat profile has been submitted for verification.' });
      setLeague(''); setTeamName(''); setProfileUrl('');
    } catch {
      toast({ title: 'Error', description: 'Failed to submit profile.', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-primary" />
          Verified Stat Profiles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing submissions */}
        {(profiles ?? []).map((p: any) => (
          <div key={p.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <div>
              <span className="font-medium capitalize">{p.league}</span>
              {p.team_name && <span className="text-muted-foreground"> — {p.team_name}</span>}
            </div>
            <VerifiedStatBadge status={p.status ?? 'pending'} />
          </div>
        ))}

        {/* Submission form */}
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <div className="grid grid-cols-2 gap-2">
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baseball">Baseball</SelectItem>
                <SelectItem value="softball">Softball</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="League (e.g. NCAA)" value={league} onChange={e => setLeague(e.target.value)} className="h-8 text-xs" />
          </div>
          <Input placeholder="Team Name (optional)" value={teamName} onChange={e => setTeamName(e.target.value)} className="h-8 text-xs" />
          <Input placeholder="Profile URL" value={profileUrl} onChange={e => setProfileUrl(e.target.value)} className="h-8 text-xs" />
          <Button onClick={handleSubmit} disabled={!league || !profileUrl || submitProfile.isPending} size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Submit Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

