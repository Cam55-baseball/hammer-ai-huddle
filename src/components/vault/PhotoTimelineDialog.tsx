import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, ZoomIn, X, GitCompareArrows } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoEntry {
  id: string;
  photo_date: string;
  photo_urls: string[];
  weight_lbs: number | null;
  body_fat_percent: number | null;
  arm_measurement: number | null;
  chest_measurement: number | null;
  waist_measurement: number | null;
  leg_measurement: number | null;
  notes: string | null;
  cycle_week?: number;
}

interface PhotoTimelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: PhotoEntry[];
  signedUrls: Record<string, string>;
}

export function PhotoTimelineDialog({ open, onOpenChange, photos, signedUrls }: PhotoTimelineDialogProps) {
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoomedUrl, setZoomedUrl] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const selectedPhotos = photos.filter(p => selectedIds.includes(p.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Progress Photo Timeline</span>
            <Button
              variant={compareMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setCompareMode(!compareMode); setSelectedIds([]); }}
              className="gap-1"
            >
              <GitCompareArrows className="h-4 w-4" />
              {compareMode ? 'Exit Compare' : 'Compare'}
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Compare view */}
        {compareMode && selectedPhotos.length >= 2 && (
          <div className="grid grid-cols-2 gap-2 p-2 border rounded-lg bg-muted/30 mb-2">
            {selectedPhotos.map(photo => {
              const url = photo.photo_urls[0] ? signedUrls[photo.photo_urls[0]] : null;
              return (
                <div key={photo.id} className="text-center space-y-1">
                  {url ? (
                    <img src={url} alt="Progress" className="w-full aspect-square object-cover rounded-lg" />
                  ) : (
                    <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">No image</div>
                  )}
                  <p className="text-[10px] text-muted-foreground">{new Date(photo.photo_date).toLocaleDateString()}</p>
                  {photo.weight_lbs && <Badge variant="secondary" className="text-[10px]">{photo.weight_lbs} lbs</Badge>}
                </div>
              );
            })}
          </div>
        )}

        {compareMode && selectedPhotos.length < 2 && (
          <p className="text-xs text-muted-foreground text-center">Select 2-4 photos to compare</p>
        )}

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3 pr-2">
            {photos.map((photo) => {
              const url = photo.photo_urls[0] ? signedUrls[photo.photo_urls[0]] : null;
              const isSelected = selectedIds.includes(photo.id);
              return (
                <div
                  key={photo.id}
                  onClick={() => compareMode && toggleSelect(photo.id)}
                  className={cn(
                    'flex gap-3 p-3 rounded-lg border transition-all',
                    compareMode && 'cursor-pointer hover:bg-accent/50',
                    isSelected && 'ring-2 ring-primary bg-primary/5'
                  )}
                >
                  {/* Thumbnail */}
                  <div className="relative shrink-0">
                    {url ? (
                      <img
                        src={url}
                        alt="Progress"
                        className="w-20 h-20 object-cover rounded-lg"
                        onClick={(e) => { if (!compareMode) { e.stopPropagation(); setZoomedUrl(url); } }}
                      />
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    {!compareMode && url && (
                      <button
                        className="absolute bottom-1 right-1 p-1 bg-background/80 rounded-full"
                        onClick={(e) => { e.stopPropagation(); setZoomedUrl(url); }}
                      >
                        <ZoomIn className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {new Date(photo.photo_date).toLocaleDateString()}
                      </span>
                      {(photo as any).cycle_week != null && (
                        <Badge variant="outline" className="text-[10px]">Week {(photo as any).cycle_week}</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {photo.weight_lbs && <Badge variant="secondary" className="text-[10px]">{photo.weight_lbs} lbs</Badge>}
                      {photo.body_fat_percent && <Badge variant="secondary" className="text-[10px]">BF {photo.body_fat_percent}%</Badge>}
                      {photo.arm_measurement && <Badge variant="secondary" className="text-[10px]">Arm {photo.arm_measurement}"</Badge>}
                      {photo.chest_measurement && <Badge variant="secondary" className="text-[10px]">Chest {photo.chest_measurement}"</Badge>}
                    </div>
                    {photo.notes && <p className="text-[10px] text-muted-foreground mt-1 truncate">{photo.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Zoom overlay */}
        {zoomedUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setZoomedUrl(null)}
          >
            <button className="absolute top-4 right-4 p-2 bg-background/80 rounded-full" onClick={() => setZoomedUrl(null)}>
              <X className="h-5 w-5" />
            </button>
            <img src={zoomedUrl} alt="Zoomed" className="max-w-full max-h-full object-contain rounded-lg" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
