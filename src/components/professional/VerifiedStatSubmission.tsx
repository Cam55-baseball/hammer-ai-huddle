import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVerifiedStats } from '@/hooks/useVerifiedStats';
import { VerifiedStatBadge } from './VerifiedStatBadge';
import { ExternalLink, Plus, Upload, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getSitesForSport, validateUrlForSite, type StatSite } from '@/data/verifiedStatSites';
import { verifiedStatBoosts } from '@/data/verifiedStatBoosts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function VerifiedStatSubmission() {
  const { data: profiles, isLoading, submitProfile } = useVerifiedStats();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sport, setSport] = useState<'baseball' | 'softball'>('baseball');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [teamName, setTeamName] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [urlError, setUrlError] = useState('');

  const availableSites = getSitesForSport(sport);
  const selectedSite = availableSites.find(s => s.id === selectedSiteId);

  const handleUrlChange = (url: string) => {
    setProfileUrl(url);
    if (selectedSite && url) {
      const result = validateUrlForSite(url, selectedSite);
      setUrlError(result.valid ? '' : (result.message || ''));
    } else {
      setUrlError('');
    }
  };

  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId);
    // Re-validate URL if already entered
    const site = availableSites.find(s => s.id === siteId);
    if (site && profileUrl) {
      const result = validateUrlForSite(profileUrl, site);
      setUrlError(result.valid ? '' : (result.message || ''));
    }
  };

  const handleSubmit = async () => {
    if (!selectedSite || !profileUrl) return;

    const validation = validateUrlForSite(profileUrl, selectedSite);
    if (!validation.valid) {
      setUrlError(validation.message || 'Invalid URL');
      return;
    }

    let screenshotPath: string | undefined;
    if (screenshotFile && user) {
      try {
        const ext = screenshotFile.name.split('.').pop();
        const path = `${user.id}/verified-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('vault-photos').upload(path, screenshotFile);
        if (upErr) throw upErr;
        screenshotPath = path;
      } catch {
        toast({ title: 'Screenshot upload failed', variant: 'destructive' });
        return;
      }
    }

    try {
      await submitProfile.mutateAsync({
        sport,
        league: selectedSite.label,
        profile_type: selectedSite.profileType,
        team_name: teamName || undefined,
        profile_url: profileUrl,
        screenshot_path: screenshotPath,
      });
      toast({ title: 'Submitted', description: 'Your stat profile has been submitted for verification.' });
      setSelectedSiteId('');
      setTeamName('');
      setProfileUrl('');
      setScreenshotFile(null);
      setUrlError('');
    } catch {
      toast({ title: 'Error', description: 'Failed to submit profile. It may already exist.', variant: 'destructive' });
    }
  };

  const handleRequestRemoval = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('verified_stat_profiles')
        .update({ removal_requested: true } as any)
        .eq('id', profileId);
      if (error) throw error;
      toast({ title: 'Removal requested', description: 'An admin will review your removal request.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to request removal.', variant: 'destructive' });
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
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{p.league}</span>
                {p.team_name && <span className="text-muted-foreground">— {p.team_name}</span>}
              </div>
              {p.profile_type && (
                <span className="text-[10px] text-muted-foreground capitalize">
                  {verifiedStatBoosts[p.profile_type]?.label || p.profile_type}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <VerifiedStatBadge status={p.admin_verified ? 'verified' : p.verified === false && p.rejection_reason ? 'rejected' : 'pending'} />
              {p.admin_verified && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1 text-destructive hover:text-destructive"
                  onClick={() => handleRequestRemoval(p.id)}
                  disabled={p.removal_requested}
                >
                  {p.removal_requested ? 'Requested' : <Trash2 className="h-3 w-3" />}
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* Submission form */}
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <div className="grid grid-cols-2 gap-2">
            <Select value={sport} onValueChange={(v: 'baseball' | 'softball') => { setSport(v); setSelectedSiteId(''); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baseball">Baseball</SelectItem>
                <SelectItem value="softball">Softball</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedSiteId} onValueChange={handleSiteChange}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select stat site..." /></SelectTrigger>
              <SelectContent>
                {availableSites.map(site => (
                  <SelectItem key={site.id} value={site.id}>{site.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Team Name (optional)" value={teamName} onChange={e => setTeamName(e.target.value)} className="h-8 text-xs" />
          <div>
            <Input
              placeholder="Profile URL"
              value={profileUrl}
              onChange={e => handleUrlChange(e.target.value)}
              className={`h-8 text-xs ${urlError ? 'border-destructive' : ''}`}
            />
            {urlError && <p className="text-[10px] text-destructive mt-0.5">{urlError}</p>}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              <Upload className="h-3 w-3" />
              {screenshotFile ? screenshotFile.name.slice(0, 20) : 'Screenshot (optional)'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => setScreenshotFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!selectedSiteId || !profileUrl || !!urlError || submitProfile.isPending}
            size="sm"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-1" /> Submit Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
