import { useState, useEffect } from 'react';
import { Share2, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ShareSessionDialogProps {
  sessionId: string;
}

interface LinkedUser {
  id: string;
  full_name: string | null;
  relationship: string;
}

export function ShareSessionDialog({ sessionId }: ShareSessionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [linkedUsers, setLinkedUsers] = useState<LinkedUser[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);

    const fetchLinked = async () => {
      // Get all accepted scout_follows where user is either scout or player
      const [asScout, asPlayer] = await Promise.all([
        supabase
          .from('scout_follows')
          .select('player_id')
          .eq('scout_id', user.id)
          .eq('status', 'accepted'),
        supabase
          .from('scout_follows')
          .select('scout_id')
          .eq('player_id', user.id)
          .eq('status', 'accepted'),
      ]);

      const ids = new Set<string>();
      asScout.data?.forEach((r) => ids.add(r.player_id));
      asPlayer.data?.forEach((r) => ids.add(r.scout_id));

      if (ids.size === 0) {
        setLinkedUsers([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(ids));

      setLinkedUsers(
        (profiles ?? []).map((p) => ({
          id: p.id,
          full_name: p.full_name,
          relationship: 'linked',
        }))
      );
      setLoading(false);
    };

    fetchLinked();
  }, [open, user]);

  const handleShare = async () => {
    if (!user || !selectedRecipient) return;
    setSending(true);

    try {
      const { error } = await supabase.from('royal_timing_shares').insert({
        session_id: sessionId,
        sender_id: user.id,
        recipient_id: selectedRecipient,
        message: message || null,
      });

      if (error) throw error;
      toast({ title: 'Session shared successfully' });
      setOpen(false);
      setMessage('');
      setSelectedRecipient('');
    } catch (err) {
      console.error('Share error:', err);
      toast({ title: 'Failed to share session', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" /> Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Timing Session</DialogTitle>
          <DialogDescription>Send this session to a linked coach or player for review.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-sm font-medium">Recipient</Label>
            {loading ? (
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading contacts...
              </div>
            ) : linkedUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-1">
                No linked coaches or players found. Link with someone first.
              </p>
            ) : (
              <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {linkedUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || 'Unknown User'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label className="text-sm font-medium">Message (optional)</Label>
            <Textarea
              placeholder="Add notes or context about this session..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 min-h-[80px]"
            />
          </div>

          <Button
            className="w-full"
            onClick={handleShare}
            disabled={sending || !selectedRecipient}
          >
            {sending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Send Session</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
