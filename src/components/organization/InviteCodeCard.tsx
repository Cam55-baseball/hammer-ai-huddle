import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Copy, RefreshCw, Loader2 } from 'lucide-react';

interface InviteCodeCardProps {
  orgId: string;
  existingCode?: string | null;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function InviteCodeCard({ orgId, existingCode }: InviteCodeCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(existingCode ?? '');

  const generate = async () => {
    setLoading(true);
    try {
      const newCode = generateCode();
      const { error } = await supabase
        .from('organizations')
        .update({ invite_code: newCode })
        .eq('id', orgId);
      if (error) throw error;
      setCode(newCode);
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast({ title: 'Code generated', description: `New invite code: ${newCode}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copied!', description: 'Invite code copied to clipboard.' });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">Invite Code</CardTitle>
      </CardHeader>
      <CardContent>
        {code ? (
          <div className="flex items-center gap-3">
            <span className="text-3xl font-mono font-bold tracking-[0.3em] text-primary">{code}</span>
            <Button variant="ghost" size="icon" onClick={copy} className="h-8 w-8">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={generate} disabled={loading} className="h-8 w-8">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <Button onClick={generate} disabled={loading} variant="outline" size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Generate Invite Code
          </Button>
        )}
        <p className="text-xs text-muted-foreground mt-2">Share this code with your players to join.</p>
      </CardContent>
    </Card>
  );
}
