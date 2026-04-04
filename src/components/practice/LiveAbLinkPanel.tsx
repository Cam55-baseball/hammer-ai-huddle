import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Link2, Copy, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export function LiveAbLinkPanel({ linkCode, onLinkEstablished, onUnlink }: LiveAbLinkPanelProps) {
  const { user } = useAuth();
  const { sport } = useSportTheme();
  const { toast } = useToast();
  const [mode, setMode] = useState<'idle' | 'generate' | 'join'>('idle');
  const [generatedCode, setGeneratedCode] = useState<string | null>(linkCode);
  const [joinInput, setJoinInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linked, setLinked] = useState(!!linkCode);

  const handleGenerate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Cancel any existing pending links for this user
      await supabase.rpc('cancel_pending_links', { p_user_id: user.id });

      const code = generateCode();
      const { error } = await supabase.from('live_ab_links' as any).insert({
        link_code: code,
        creator_user_id: user.id,
        sport: sport || 'baseball',
        status: 'pending',
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

      // Atomic claim — handles expiration, self-join guard, and race conditions in one statement
      const { data: claimed, error: claimErr } = await supabase
        .rpc('claim_ab_link', { p_code: code, p_user_id: user.id });

      if (claimErr) throw claimErr;

      const link = Array.isArray(claimed) ? claimed[0] : claimed;
      if (!link) {
        toast({ title: 'Invalid Code', description: 'Code not found, expired, already used, or is your own.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      setLinked(true);
      setGeneratedCode(code);
      // creator_session_id may be null if creator hasn't saved yet — that's OK,
      // realtime uses link_code for broadcast and defers session sync
      onLinkEstablished(code, (link as any).creator_session_id ?? undefined);
      toast({ title: 'Linked!', description: 'Sessions are now connected.' });
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

  const handleUnlink = () => {
    setLinked(false);
    setGeneratedCode(null);
    setMode('idle');
    setJoinInput('');
    onUnlink();
  };

  if (linked && generatedCode) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
        <Link2 className="h-4 w-4 text-primary" />
        <div className="flex-1">
          <p className="text-xs font-medium">Session Linked</p>
          <Badge variant="outline" className="text-[10px] mt-0.5">{generatedCode}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={handleUnlink} className="text-xs text-destructive">
          Unlink
        </Button>
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

      {mode === 'generate' && generatedCode && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="text-sm font-mono px-3 py-1">{generatedCode}</Badge>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 w-7 p-0">
              {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Share this code with your partner</p>
        </div>
      )}

      {mode === 'join' && (
        <div className="flex gap-2">
          <Input
            value={joinInput}
            onChange={e => setJoinInput(e.target.value)}
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
