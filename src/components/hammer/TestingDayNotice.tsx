/** Read-only testing-day details; verified result entry stays with staff. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { testingDaysToday } from "@/lib/hammer/testingDayNotice";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { TestingDayRow } from '@/lib/hammer/testingDayNotice';

export function TestingDayNotice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");
  const { data, error, isLoading } = useQuery({
    queryKey: ["testing-day-notice", user?.id, today],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user) throw new Error('Sign in first');
      const { data, error } = await supabase
        .from("testing_days")
        .select("id,scheduled_for,status,tests")
        .eq("athlete_id", user.id)
        .eq("scheduled_for", today);
      if (error) throw error;
      if (!data) throw new Error('Testing-day source unavailable');
      return testingDaysToday(data, today);
    },
  });
  if (error) return <p role="alert" className="text-sm text-destructive">Couldn't check for a testing day. Try again later.</p>;
  if (isLoading || !data?.length) return null;
  const selected = data.find(day => day.id === selectedId) ?? null;
  return (
    <>
      {data.map((d) => (
        <div key={d.id} className="rounded-md border border-border/60 bg-card px-2.5 py-2" data-testid="testing-day-notice">
          <div className="flex items-center gap-2 text-sm font-medium"><ClipboardCheck className="h-4 w-4 text-primary" aria-hidden />Testing day today</div>
          <p className="mt-1 break-words text-[11px] text-muted-foreground">Tests: {(d.tests ?? []).filter((t) => t.trim()).join(", ")}</p>
          <p className="text-[11px] text-muted-foreground">Your coach records the results. Nothing to enter yourself.</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => setSelectedId(d.id)}>Testing-day details</Button>
        </div>
      ))}
      <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelectedId(null); }}>
        <DialogContent className="w-[calc(100%-2rem)]">
          <DialogHeader><DialogTitle>Testing day</DialogTitle><DialogDescription>Your coach records the verified results.</DialogDescription></DialogHeader>
          {selected && <div className="space-y-3 text-sm">
            <p>Date: {format(new Date(`${selected.scheduled_for}T12:00:00`), 'MMMM d, yyyy')}</p>
            <p>Status: Scheduled</p>
            <div><p className="font-medium">Tests</p><ul className="list-disc space-y-1 pl-5">{(selected.tests ?? []).filter(test => test.trim()).map((test, index) => <li key={`${test}-${index}`} className="break-words">{test}</li>)}</ul></div>
            <p className="text-muted-foreground">Time and location: Not entered. Ask your coach or organization.</p>
            <Button variant="outline" onClick={() => { setSelectedId(null); navigate('/my-connections'); }}>My coach and organization</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </>
  );
}
