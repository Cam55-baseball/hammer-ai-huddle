import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const PROGRESSION_LABELS: Record<number, string> = {
  1: 'Tee Ball', 2: 'Youth', 3: 'Middle School', 4: 'High School',
  5: 'College', 6: 'Pro', 7: 'Elite',
};

export function PendingDrillsQueue() {
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: pendingDrills, isLoading } = useQuery({
    queryKey: ['pending-drills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_drills')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (pendingDrill: any) => {
      // Create real drill
      const { data: newDrill, error: drillError } = await supabase
        .from('drills')
        .insert({
          name: pendingDrill.title,
          description: pendingDrill.description,
          sport: pendingDrill.sport,
          module: pendingDrill.module,
          skill_target: pendingDrill.skill_target,
          ai_context: pendingDrill.ai_context,
          progression_level: pendingDrill.progression_level,
          is_active: true,
          is_published: true,
        })
        .select('id')
        .single();

      if (drillError) throw drillError;

      // Add positions
      const positions = pendingDrill.positions || [];
      if (positions.length > 0) {
        await supabase.from('drill_positions').insert(
          positions.map((p: string) => ({ drill_id: newDrill.id, position: p }))
        );
      }

      // Add tags - look up tag IDs by name
      const tags = pendingDrill.tags || {};
      const allTagNames = [
        ...(tags.error_type || []),
        ...(tags.skill || []),
        ...(tags.situation || []),
      ];

      if (allTagNames.length > 0) {
        const { data: tagRows } = await supabase
          .from('drill_tags')
          .select('id, name')
          .in('name', allTagNames);

        if (tagRows && tagRows.length > 0) {
          await supabase.from('drill_tag_map').insert(
            tagRows.map(t => ({ drill_id: newDrill.id, tag_id: t.id, weight: 1 }))
          );
        }
      }

      // Mark pending drill as accepted
      await supabase
        .from('pending_drills')
        .update({ status: 'accepted' })
        .eq('id', pendingDrill.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-drills'] });
      queryClient.invalidateQueries({ queryKey: ['owner-drills-cms'] });
      toast.success('Drill accepted and added to library');
    },
    onError: () => toast.error('Failed to accept drill'),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('pending_drills')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-drills'] });
      setRejectDialogOpen(false);
      setRejectingId(null);
      setRejectionReason('');
      toast.success('Drill rejected');
    },
    onError: () => toast.error('Failed to reject drill'),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-drills', {
        body: { sport: 'baseball', module: 'fielding', count: 5 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-drills'] });
      toast.success(`Generated ${data?.generated ?? 0} drill suggestions`);
    },
    onError: (err: any) => {
      console.error('Generate drills error:', err);
      toast.error('Failed to generate drills');
    },
  });

  const handleReject = (id: string) => {
    setRejectingId(id);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const count = pendingDrills?.length ?? 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Pending Review
              {count > 0 && (
                <Badge variant="secondary" className="ml-1">{count}</Badge>
              )}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="gap-1.5"
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Generate Drills
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6 text-muted-foreground animate-pulse">Loading...</div>
          ) : count === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No pending drills. Click "Generate Drills" to create Hammer suggestions.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Sport</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingDrills?.map((drill) => {
                    const tags = drill.tags as any;
                    const allTags = [
                      ...(tags?.error_type || []),
                      ...(tags?.skill || []),
                      ...(tags?.situation || []),
                    ];
                    return (
                      <TableRow key={drill.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {drill.title}
                        </TableCell>
                        <TableCell className="capitalize">{drill.sport}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {PROGRESSION_LABELS[drill.progression_level] ?? `L${drill.progression_level}`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap max-w-[200px]">
                            {allTags.slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-[10px]">
                                {tag.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-green-600 hover:text-green-700"
                              onClick={() => acceptMutation.mutate(drill)}
                              disabled={acceptMutation.isPending}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleReject(drill.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Drill</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Why is this drill being rejected?"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => rejectingId && rejectMutation.mutate({ id: rejectingId, reason: rejectionReason })}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
