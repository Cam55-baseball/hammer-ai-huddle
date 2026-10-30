import { useState, type ReactNode } from 'react';
import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/** Every General / coach / organization section: tap the title for "What this means" and "How to use it". */
export function MeaningTitle({ title, children, use, organization = false }: { title: ReactNode; children: ReactNode; use?: ReactNode; organization?: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button variant="ghost" onClick={() => setOpen(true)} className="h-auto min-h-11 max-w-full justify-start gap-2 whitespace-normal px-0 text-left text-lg font-semibold" aria-label={typeof title === 'string' ? (organization ? `What does this mean? ${title}` : `What this means: ${title}`) : 'What this means'}>
      {title}<CircleHelp className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[80dvh] overflow-y-auto"><DialogHeader>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription className="sr-only">What this means and how to use it</DialogDescription>
    </DialogHeader>
      <div className="space-y-4 text-base leading-relaxed">
        <div><h3 className="font-semibold">{organization ? 'What does this mean?' : 'What this means'}</h3><div className="text-muted-foreground">{children}</div></div>
        {use && <div data-how-to-use><h3 className="font-semibold">How to use it</h3><div className="text-muted-foreground">{use}</div></div>}
      </div>
    </DialogContent></Dialog>
  </>;
}

export function MeaningSection({ title, explanation, use, children, collapsed = false, organization = false }: { title: string; explanation: string; use: string; children: ReactNode; collapsed?: boolean; organization?: boolean }) {
  return <section className="min-w-0 space-y-3 border-t border-border pt-4" aria-label={title}>
    <h2><MeaningTitle title={title} use={use} organization={organization}>{explanation}</MeaningTitle></h2>
    {collapsed ? <details><summary className="cursor-pointer py-2 text-base text-muted-foreground">Show</summary><div className="min-w-0 space-y-4 pt-3">{children}</div></details> : children}
  </section>;
}
