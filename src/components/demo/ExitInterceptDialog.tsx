import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (email: string) => void | Promise<void>;
  onLeave: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ExitInterceptDialog({ open, onOpenChange, onSave, onLeave }: Props) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async () => {
    const v = email.trim().slice(0, 255);
    if (!EMAIL_RE.test(v)) {
      setErr('Enter a valid email');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await onSave(v);
      setEmail('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Save your personalized plan?</DialogTitle>
          <DialogDescription className="text-xs">
            We'll email it to you so you can pick up where you left off.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-8"
              maxLength={255}
            />
          </div>
          {err && <p className="text-[11px] text-destructive">{err}</p>}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleSave} disabled={busy} className="w-full">
            {busy ? 'Saving…' : 'Save my plan'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onLeave} className="w-full text-muted-foreground">
            Leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
