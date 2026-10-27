import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function BuilderLibraryLink() {
  return <Button asChild variant="outline" size="sm"><a href="/video-library" target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open Video Library</a></Button>;
}