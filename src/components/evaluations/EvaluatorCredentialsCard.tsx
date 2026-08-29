import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

/**
 * Own-profile card for scouts and coaches: the job title and organization that
 * ride along with every report they file. Reports are never anonymous, and now
 * never credential-less either.
 */
export function EvaluatorCredentialsCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [org, setOrg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('evaluator_title, evaluator_organization')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const row = (data ?? {}) as { evaluator_title?: string | null; evaluator_organization?: string | null };
      setTitle(row.evaluator_title ?? '');
      setOrg(row.evaluator_organization ?? '');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          evaluator_title: title.trim() || null,
          evaluator_organization: org.trim() || null,
        } as never)
        .eq('id', user.id);
      if (error) throw error;
      toast({
        title: 'Credentials saved',
        description: 'These now appear on every report you file.',
      });
    } catch (err) {
      toast({
        title: 'Could not save credentials',
        description: (err as Error)?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BadgeCheck className="h-5 w-5 text-primary" />
          Your evaluator credentials
        </CardTitle>
        <CardDescription>
          Shown next to your name on every scouting report you file, so players know exactly who
          graded them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="evaluator_title">Job title</Label>
                <Input
                  id="evaluator_title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Area Scout, Head Coach"
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evaluator_organization">Organization</Label>
                <Input
                  id="evaluator_organization"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder="e.g. Texas Rangers, Prep Baseball Report"
                  className="h-11 text-base"
                />
              </div>
            </div>
            <Button onClick={save} disabled={saving} size="lg">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save credentials
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
