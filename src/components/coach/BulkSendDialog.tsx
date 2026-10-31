import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSentActivities } from '@/hooks/useSentActivities';
import { useWorkoutCatalog } from '@/hooks/useWorkoutCatalog';
import { SEND_CATEGORIES, sendCatalog, filterSendCatalog } from '@/lib/coachRx/sendCatalog';
import type { CustomActivityTemplate } from '@/types/customActivity';
import { SendToPlayerDialog } from '@/components/custom-activities/SendToPlayerDialog';

interface BulkSendDialogProps { open: boolean; onOpenChange: (open: boolean) => void; selectedPlayerIds: string[]; selectedPlayerNames: string[]; }
export function BulkSendDialog({ open, onOpenChange, selectedPlayerIds, selectedPlayerNames }: BulkSendDialogProps) {
  const { user } = useAuth();
  const { loading, sendActivityToPlayers } = useSentActivities();
  const vault = useWorkoutCatalog();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sport, setSport] = useState('baseball');
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [sending, setSending] = useState(false);
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<CustomActivityTemplate | null>(null);
  const templates = useQuery({ queryKey: ['coach-send-templates', user?.id], enabled: open && !!user, queryFn: async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return [];
    const { data, error } = await supabase.from('custom_activity_templates').select('*').eq('user_id', auth.user.id).is('deleted_at', null).order('title');
    if (error) throw error;
    return (data ?? []) as unknown as CustomActivityTemplate[];
  } });
  useEffect(() => { if (open) { setSearch(''); setCategory('all'); setSelected([]); setSentIds([]); setDate(new Date().toLocaleDateString('en-CA')); } }, [open]);
  const items = sendCatalog(vault.data ?? [], templates.data ?? [], sport);
  const filtered = filterSendCatalog(items, search, category);
  const send = async () => {
    const chosen = items.filter(item => selected.includes(item.id));
    const first = chosen[0];
    if (!first) return;
    setDraft({ id: first.templateId ?? crypto.randomUUID(), title: chosen.length === 1 ? first.title : `${first.category} workout`, activity_type: 'workout', sport, icon: 'dumbbell', intensity: 'standard', exercises: chosen.flatMap(item => item.exercises), coach_card_category: first.category, source_template_id: chosen.length === 1 ? first.templateId : null } as unknown as CustomActivityTemplate);
  };
  const toggle = (id: string) => setSelected(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  return <><Dialog open={open && !draft} onOpenChange={next => { if (!sending) onOpenChange(next); }}>
    <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col overflow-hidden">
      <DialogHeader><DialogTitle>Build workout</DialogTitle></DialogHeader>
      <p className="text-sm break-words">To: {selectedPlayerNames.join(', ')}</p>
      <div className="grid grid-cols-2 gap-2">
        <Select value={sport} onValueChange={value => { setSport(value); setSelected([]); }}><SelectTrigger aria-label="Activity sport"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="baseball">Baseball</SelectItem><SelectItem value="softball">Softball</SelectItem></SelectContent></Select>
        <Select value={category} onValueChange={setCategory}><SelectTrigger aria-label="Activity category"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{SEND_CATEGORIES.map(value => <SelectItem key={value} value={value}>{value === 'lift' ? 'Lifting' : value.charAt(0).toUpperCase() + value.slice(1)}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search Hammers activities" placeholder="Search Hammers activities…" value={search} onChange={event => setSearch(event.target.value)} className="pl-9" /></div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto" aria-label="Hammers activities">
        {(vault.error || templates.error) && <p role="alert" className="text-sm text-destructive">Couldn't load all activities. Close and try again.</p>}
        {vault.isLoading || templates.isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : filtered.length === 0 ? <p className="text-sm text-muted-foreground">No activities found.</p> : filtered.map(item => <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3">
          <Checkbox aria-label={`Pick ${item.title}`} checked={selected.includes(item.id)} disabled={sending || sentIds.includes(item.id) || (selected.length > 0 && items.find(value => value.id === selected[0])?.category !== item.category)} onCheckedChange={() => toggle(item.id)} />
          <span className="min-w-0 text-sm"><span className="block font-medium break-words">{item.title}</span><span className="block text-xs text-muted-foreground capitalize">{item.category} · {item.source}{sentIds.includes(item.id) ? ' · Sent' : ''}</span></span>
        </label>)}
      </div>
      <Label htmlFor="coach-send-day">Day</Label><Input id="coach-send-day" type="date" min={new Date().toLocaleDateString('en-CA')} value={date} onChange={event => setDate(event.target.value)} disabled={sending} />
      <div className="flex justify-end gap-2 border-t border-border pt-3"><Button variant="outline" disabled={sending} onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={sending || loading || !selected.length || !selectedPlayerIds.length || !date || !!vault.error || !!templates.error} onClick={() => void send()}><Send className="mr-2 h-4 w-4"/>Schedule & preview</Button></div>
    </DialogContent>
  </Dialog><SendToPlayerDialog open={!!draft && open} onOpenChange={next => { if (!next) { setDraft(null); onOpenChange(false); } }} template={draft} initialPlayerIds={selectedPlayerIds}/></>;
}
