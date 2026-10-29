import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PHYSIO_SETTING_KEY, physioDefaults, type PhysioDefaults } from '../../../supabase/functions/_shared/health/physioMapping';
export function PhysioMappingSettings() {
  const [settings, setSettings] = useState<PhysioDefaults>(physioDefaults(null));
  const [message,setMessage]=useState('');
  const query=useQuery({queryKey:['physio-mapping-defaults'],queryFn:async()=>{
    const r=await supabase.from('app_settings').select('setting_value').eq('setting_key',PHYSIO_SETTING_KEY).maybeSingle();
    if(r.error)throw r.error;return physioDefaults(r.data?.setting_value);
  }});
  useEffect(()=>{if(query.data)setSettings(query.data);},[query.data]);
  async function save(){
    const value=physioDefaults(settings);setMessage('Saving…');
    const r=await supabase.from('app_settings').upsert({setting_key:PHYSIO_SETTING_KEY,setting_value:value});
    if(r.error){setMessage("Couldn't save. Your changes are still here.");return;}
    const back=await query.refetch();
    setMessage(!back.error&&JSON.stringify(back.data)===JSON.stringify(value)?'Health defaults saved and read back.':"Saved, but couldn't confirm the settings.");
  }
  return <section aria-label="Health & Physio Defaults" className="space-y-3 border-y border-border py-4">
    <h2 className="text-lg font-semibold">Health & Physio Defaults</h2>
    <p className="text-sm text-muted-foreground">Healed injuries stay in history with warm-up prehab. New pain still stops affected work. Fever always means recovery only.</p>
    <Label htmlFor="illness-mode">While illness is active</Label>
    <Select value={settings.illnessMode} onValueChange={v=>setSettings(s=>({...s,illnessMode:v==='recovery'?'recovery':'light'}))}><SelectTrigger id="illness-mode"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="light">Light day or recovery</SelectItem><SelectItem value="recovery">Recovery only</SelectItem></SelectContent></Select>
    <Label htmlFor="illness-days">Show “Please talk to a professional” after illness days</Label>
    <Input id="illness-days" type="number" min={1} max={3} step={1} value={settings.professionalAfterDays} onChange={e=>setSettings(s=>({...s,professionalAfterDays:Number(e.target.value)}))} />
    <Button onClick={save} disabled={query.isPending||query.isError}>Save health defaults</Button>
    {query.isError&&<p role="alert">Couldn't read saved defaults.</p>}{message&&<p role="status">{message}</p>}
  </section>;
}