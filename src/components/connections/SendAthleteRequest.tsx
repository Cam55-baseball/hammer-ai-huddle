import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Search, Send, UserPlus, Copy } from 'lucide-react';

type Hit = { id: string; full_name: string | null; grad_year: number | null; state: string | null; under_18: boolean; request_status: string | null };
type Req = { id: string; kind: string; incoming: boolean; other_name: string; status: string; created_at: string; org_name: string | null };

const STATUS_LABEL: Record<string, string> = { pending: 'Waiting for answer', accepted: 'Connected', denied: 'Denied', cancelled: 'Cancelled' };

/** Coach → player, or organization → athlete, through the existing connection request system. */
export function SendAthleteRequest({ organizationId, inviteCode, orgName }: { organizationId?: string; inviteCode?: string | null; orgName?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const kind = organizationId ? 'org_player' : 'coach_player';

  const sent = useQuery({
    queryKey: ['my-requests', user?.id, 'sent', kind, organizationId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('list_my_requests_v2');
      if (error) throw error;
      return ((data ?? []) as Req[]).filter((r) => r.kind === kind && !r.incoming && (!organizationId || !orgName || r.org_name === orgName)).slice(0, 10);
    },
  });

  const search = async () => {
    if (q.trim().length < 2) { toast.error('Type at least 2 letters'); return; }
    setBusy(true);
    const { data, error } = await (supabase as any).rpc('search_athletes_to_connect', { _q: q.trim(), _organization_id: organizationId ?? null });
    setBusy(false);
    if (error) { toast.error(error.message ?? 'Search failed'); return; }
    setHits((data ?? []) as Hit[]);
  };

  const send = async (h: Hit) => {
    setSending(h.id);
    const { error } = await supabase.rpc('send_connection_request', { _kind: kind, _to_user: h.id, _organization_id: organizationId ?? null } as any);
    setSending(null);
    if (error) { toast.error(error.message ?? 'Could not send the request'); return; }
    toast.success(h.under_18 ? 'Request sent. A parent may need to answer it.' : 'Request sent');
    setHits((cur) => cur?.map((x) => (x.id === h.id ? { ...x, request_status: 'pending' } : x)) ?? null);
    qc.invalidateQueries({ queryKey: ['my-requests'] });
  };

  const link = inviteCode ? `${window.location.origin}/join?code=${inviteCode}` : '';
  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => toast.success('Copied'), () => toast.error('Could not copy'));

  const searchPanel = (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input type="search" inputMode="search" placeholder="Name, email or grad year" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} aria-label="Search athletes" />
        <Button onClick={search} disabled={busy} aria-label="Search">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</Button>
      </div>
      <p className="text-xs text-muted-foreground">Players under 18 only show up if a parent allowed it. Test accounts only show up by exact email.</p>
      {hits && hits.length === 0 && <p className="py-2 text-center text-sm text-muted-foreground">No athletes found</p>}
      {hits?.map((h) => {
        const st = h.request_status;
        const blocked = st === 'pending' || st === 'accepted';
        return (
          <div key={h.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{h.full_name || 'Name not entered'}</p>
              <p className="text-xs text-muted-foreground">Grad year: {h.grad_year ?? 'Not entered'} · State: {h.state || 'Not entered'}</p>
              {h.under_18 && <Badge variant="secondary" className="mt-1 text-[10px]">Under 18</Badge>}
              {st && <p className="mt-1 text-xs">Request: <span className="font-medium">{STATUS_LABEL[st] ?? st}</span></p>}
            </div>
            <Button size="sm" onClick={() => send(h)} disabled={blocked || sending === h.id}>
              {sending === h.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-1 h-4 w-4" />Send request</>}
            </Button>
          </div>
        );
      })}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          {organizationId ? 'Add athletes' : 'Add players'}
          <Button size="sm" onClick={() => setOpen(true)}><UserPlus className="mr-1 h-4 w-4" />{organizationId ? 'Add athlete' : 'Add a player'}</Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">Requests you sent</p>
        {(sent.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No requests sent yet.</p> : sent.data!.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
            <span className="truncate">{r.other_name}</span>
            <Badge variant={r.status === 'accepted' ? 'default' : 'secondary'}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
          </div>
        ))}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{organizationId ? 'Add athlete' : 'Add a player'}</DialogTitle>
            <DialogDescription>They get a request in their Requests inbox and tap Accept or Deny.</DialogDescription>
          </DialogHeader>
          {organizationId ? (
            <Tabs defaultValue="search">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="search">Search and send</TabsTrigger>
                <TabsTrigger value="code">Share team code</TabsTrigger>
              </TabsList>
              <TabsContent value="search">{searchPanel}</TabsContent>
              <TabsContent value="code" className="space-y-3">
                {inviteCode ? (
                  <>
                    <p className="text-sm">Team code: <span className="font-mono text-lg font-bold">{inviteCode}</span></p>
                    <div className="flex justify-center rounded-lg bg-card p-3"><div className="rounded bg-background p-2"><QRCodeSVG value={link} size={160} /></div></div>
                    <p className="break-all text-xs text-muted-foreground">Link: {link}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => copy(inviteCode)}><Copy className="mr-1 h-4 w-4" />Copy code</Button>
                      <Button variant="outline" onClick={() => copy(link)}><Copy className="mr-1 h-4 w-4" />Copy link</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Athletes who join with the code go on your roster right away. Under-13s need a parent to join for them.</p>
                  </>
                ) : <p className="text-sm text-muted-foreground">No team code yet. Make one in the Invite tab.</p>}
              </TabsContent>
            </Tabs>
          ) : searchPanel}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
