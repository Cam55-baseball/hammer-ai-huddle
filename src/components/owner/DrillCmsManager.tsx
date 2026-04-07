import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2, Copy, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import { DrillEditorDialog } from './DrillEditorDialog';
import { cn } from '@/lib/utils';

export function DrillCmsManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDrillId, setEditingDrillId] = useState<string | null>(null);

  const { data: drills, isLoading } = useQuery({
    queryKey: ['owner-drills-cms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drills')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch positions for all drills
  const { data: allPositions } = useQuery({
    queryKey: ['owner-drill-positions'],
    queryFn: async () => {
      const { data } = await supabase.from('drill_positions').select('drill_id, position');
      return data ?? [];
    },
  });

  // Fetch tags for all drills
  const { data: allTags } = useQuery({
    queryKey: ['owner-drill-tags'],
    queryFn: async () => {
      const { data } = await supabase
        .from('drill_tag_map')
        .select('drill_id, drill_tags(name, category)');
      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (drillId: string) => {
      const { error } = await supabase.from('drills').delete().eq('id', drillId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-drills-cms'] });
      toast.success('Drill deleted');
    },
    onError: () => toast.error('Failed to delete drill'),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (drillId: string) => {
      const drill = drills?.find(d => d.id === drillId);
      if (!drill) throw new Error('Drill not found');
      
      const { id, created_at, ...rest } = drill;
      const { error } = await supabase.from('drills').insert({
        ...rest,
        name: `${drill.name} (Copy)`,
        is_published: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-drills-cms'] });
      toast.success('Drill duplicated');
    },
    onError: () => toast.error('Failed to duplicate drill'),
  });

  const filtered = drills?.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.module.toLowerCase().includes(search.toLowerCase()),
  ) ?? [];

  const getPositions = (drillId: string) =>
    allPositions?.filter(p => p.drill_id === drillId).map(p => p.position) ?? [];

  const getTags = (drillId: string) =>
    allTags?.filter((t: any) => t.drill_id === drillId).map((t: any) => t.drill_tags?.name).filter(Boolean) ?? [];

  const handleEdit = (drillId: string) => {
    setEditingDrillId(drillId);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingDrillId(null);
    setEditorOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Drill Library
            </CardTitle>
            <Button onClick={handleCreate} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create Drill
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search drills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">Loading drills...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? 'No drills match your search' : 'No drills yet. Create your first drill!'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden sm:table-cell">Sport</TableHead>
                    <TableHead className="hidden md:table-cell">Positions</TableHead>
                    <TableHead className="hidden lg:table-cell">Tags</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((drill) => (
                    <TableRow key={drill.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {drill.name}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell capitalize">
                        {drill.sport}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {getPositions(drill.id).slice(0, 2).map(p => (
                            <Badge key={p} variant="outline" className="text-[10px] capitalize">
                              {p.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex gap-1 flex-wrap max-w-[200px]">
                          {getTags(drill.id).slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">
                              {tag.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={drill.premium ? 'default' : 'secondary'} className="text-[10px]">
                          {drill.premium ? 'Premium' : 'Free'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={drill.is_published ? 'default' : 'outline'}
                          className={cn('text-[10px]', drill.is_published && 'bg-primary')}
                        >
                          {drill.is_published ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(drill.id)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicateMutation.mutate(drill.id)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(drill.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DrillEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        drillId={editingDrillId}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['owner-drills-cms'] });
          queryClient.invalidateQueries({ queryKey: ['owner-drill-positions'] });
          queryClient.invalidateQueries({ queryKey: ['owner-drill-tags'] });
        }}
      />
    </div>
  );
}
