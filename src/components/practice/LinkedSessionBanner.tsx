import { Badge } from '@/components/ui/badge';
import { Link2 } from 'lucide-react';

interface LinkedSessionBannerProps {
  linkCode: string;
}

export function LinkedSessionBanner({ linkCode }: LinkedSessionBannerProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20">
      <Link2 className="h-3.5 w-3.5 text-primary" />
      <span className="text-[11px] text-muted-foreground">Linked Session</span>
      <Badge variant="outline" className="text-[10px] font-mono ml-auto">{linkCode}</Badge>
    </div>
  );
}
