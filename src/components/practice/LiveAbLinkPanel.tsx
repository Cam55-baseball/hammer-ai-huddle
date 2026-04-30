import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Link2, Copy, Check, Loader2, Clock, AlarmClockPlus } from 'lucide-react';
import { useAbLinkStatus, AbLinkStatus } from '@/hooks/useAbLinkStatus';

interface LiveAbLinkPanelProps {
  linkCode: string | null;
  onLinkEstablished: (code: string) => void;
  onUnlink: () => void;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `AB-${code}`;
}

const STATUS_LABEL: Record<AbLinkStatus, { text: string; className: string }> = {
  pending: { text: 'Waiting for partner', className: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300' },
  claimed: { text: 'Partner joined — save to finalize', className: 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300' },
  linked: { text: 'Linked', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300' },
  expired: { text: 'Expired', className: 'bg-muted text-muted-foreground border-border' },
  unknown: { text: 'Checking…', className: 'bg-muted text-muted-foreground border-border' },
};

interface CountdownInfo {
  text: string;
  minutes: number;
  tone: 'muted' | 'amber' | 'destructive';
  pulse: boolean;
}

function useCountdown(expiresAt: string | null): CountdownInfo | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) {
    return { text: 'Expired', minutes: 0, tone: 'destructive', pulse: false };
  }
  const totalMins = Math.max(1, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const text = hours > 0 ? `${hours}h ${mins}m left` : `${totalMins}m left`;
  let tone: CountdownInfo['tone'] = 'muted';
  let pulse = false;
  if (totalMins <= 5) {
    tone = 'destructive';
    pulse = true;
  } else if (totalMins <= 30) {
    tone = 'amber';
  }
  return { text, minutes: totalMins, tone, pulse };
}

const COUNTDOWN_TONE_CLASS: Record<CountdownInfo['tone'], string> = {
  muted: 'bg-muted text-muted-foreground border-border',
  amber: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300',
  destructive: 'bg-destructive/15 text-destructive border-destructive/40',
};

export function LiveAbLinkPanel({ linkCode, onLinkEstablished, onUnlink }: LiveAbLinkPanelProps) {
  const { user } = useAuth();
  const { sport } = useSportTheme();
  const { toast } = useToast();
  const [mode, setMode] = useState<'idle' | 'generate' | 'join'>(linkCode ? 'generate' : 'idle');
  const [generatedCode, setGeneratedCode] = useState<string | null>(linkCode);
  const [joinInput, setJoinInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [copied, setCopied] = useState(false);

  const linkState = useAbLinkStatus(generatedCode);
  const countdown = useCountdown(linkState.expiresAt);
  const showLinkedView = !!generatedCode;

  const handleGenerate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const code = generateCode();
      const { error } = await supabase.rpc('create_ab_link' as any, {
        p_user_id: user.id,
        p_sport: sport || 'baseball',
        p_link_code: code,
      });
      if (error) throw error;
      setGeneratedCode(code);
      setMode('generate');
      onLinkEstablished(code);
      toast({ title: 'Link Code Generated', description: `Share code: ${code}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !joinInput.trim()) return;
    setLoading(true);
    try {
      const code = joinInput.trim().toUpperCase();
      const { data: claimed, error: claimErr } = await supabase
        .rpc('claim_ab_link' as any, { p_code: code, p_user_id: user.id });
      if (claimErr) throw claimErr;
      const link = Array.isArray(claimed) ? claimed[0] : claimed;
      if (!link) {
        toast({
          title: 'Invalid Code',
          description: 'Code not found, expired, already used, or is your own.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      setGeneratedCode(code);
      onLinkEstablished(code);
      toast({ title: 'Claimed', description: 'Session link claimed. Save to finalize.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUnlink = async () => {
    if (!user || !generatedCode) {
      onUnlink();
      return;
    }
    // If already linked, don't allow tearing down a finalized link from this UI
    if (linkState.status === 'linked') {
      toast({
        title: 'Already linked',
        description: 'This link is finalized and can no longer be cancelled.',
      });
      return;
    }
    setUnlinking(true);
    try {
      const { error } = await supabase.rpc('expire_ab_link' as any, {
        p_user_id: user.id,
        p_link_code: generatedCode,
      });
      if (error) throw error;
      setGeneratedCode(null);
      setMode('idle');
      setJoinInput('');
      onUnlink();
      toast({ title: 'Unlinked', description: 'Link cancelled on the server.' });
    } catch (err: any) {
      toast({
        title: 'Could not unlink',
        description: err.message ?? 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setUnlinking(false);
    }
  };

  if (showLinkedView && generatedCode) {
    const label = STATUS_LABEL[linkState.status];
    const isLoading = linkState.loading;
    const canUnlink = !isLoading && (linkState.status === 'pending' || linkState.status === 'claimed');
    return (
      <div className="space-y-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">AB Link</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] font-mono">{generatedCode}</Badge>
              {isLoading ? (
                <Badge variant="outline" className="text-[10px] gap-1 bg-muted text-muted-foreground border-border">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking…
                </Badge>
              ) : (
                <Badge variant="outline" className={`text-[10px] ${label.className}`}>{label.text}</Badge>
              )}
              {countdown && !isLoading && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Clock className="h-3 w-3" />
                  {countdown}
                </Badge>
              )}
            </div>
          </div>
          {canUnlink && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUnlink}
              disabled={unlinking}
              className="text-xs text-destructive"
            >
              {unlinking ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Unlink'}
            </Button>
          )}
          {linkState.status === 'expired' && (
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading} className="text-xs">
              New Code
            </Button>
          )}
        </div>
        {linkState.status === 'claimed' && (
          <p className="text-[10px] text-muted-foreground">
            {linkState.mySessionAttached
              ? 'Your session is attached. Waiting on partner to save.'
              : 'Save your session to finalize the link.'}
          </p>
        )}
        {mode === 'generate' && linkState.status === 'pending' && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs gap-1">
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy code'}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/20">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <Label className="text-xs font-medium">Link Live AB Session</Label>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Connect with another player to share live at-bat data
      </p>

      {mode === 'idle' && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading} className="text-xs">
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Generate Code
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMode('join')} className="text-xs">
            Join Session
          </Button>
        </div>
      )}

      {mode === 'join' && (
        <div className="flex gap-2">
          <Input
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
            placeholder="AB-XXXXX"
            className="h-8 text-xs font-mono uppercase"
            maxLength={8}
          />
          <Button size="sm" onClick={handleJoin} disabled={loading || !joinInput.trim()} className="text-xs">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Join'}
          </Button>
        </div>
      )}
    </div>
  );
}
