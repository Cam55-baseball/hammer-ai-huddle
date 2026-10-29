import { useState, type ReactNode } from 'react';
import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function MeaningTitle({ title, children, organization = false }: { title: ReactNode; children: ReactNode; organization?: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button variant="ghost" onClick={() => setOpen(true)} className="h-auto min-h-11 max-w-full justify-start gap-2 whitespace-normal px-0 text-left text-lg font-semibold" aria-label={typeof title === 'string' ? (organization ? `What does this mean? ${title}` : `What this means: ${title}`) : 'What this means'}>
      {title}<CircleHelp className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[80dvh] overflow-y-auto"><DialogHeader>
      <DialogTitle>{organization ? 'What Does This Mean?' : 'What This Means'}</DialogTitle>
      <DialogDescription className="pt-2 text-base font-semibold text-foreground">{title}</DialogDescription>
    </DialogHeader><div className="space-y-3 text-base leading-relaxed">{children}</div></DialogContent></Dialog>
  </>;
}

export function MeaningSection({ title, explanation, children, collapsed = false, organization = false }: { title: string; explanation: string; children: ReactNode; collapsed?: boolean; organization?: boolean }) {
  return <section className="min-w-0 space-y-3 border-t border-border pt-4" aria-label={title}>
    <h2><MeaningTitle title={title} organization={organization}>{explanation}</MeaningTitle></h2>
    {collapsed ? <details><summary className="cursor-pointer py-2 text-base text-muted-foreground">View Details</summary><div className="min-w-0 space-y-4 pt-3">{children}</div></details> : children}
  </section>;
}