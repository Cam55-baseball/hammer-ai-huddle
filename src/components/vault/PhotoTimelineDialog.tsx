import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ZoomIn, X, GitCompareArrows, Maximize2, Minimize2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
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
  const [zoomedIndex, setZoomedIndex] = useState(-1);
  const [fullscreen, setFullscreen] = useState(false);
  const [cycleFilter, setCycleFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  // Available cycle weeks for filter
  const cycleWeeks = useMemo(() => {
    const weeks = new Set<number>();
    photos.forEach(p => {
      if ((p as any).cycle_week != null) weeks.add((p as any).cycle_week);
    });
    return Array.from(weeks).sort((a, b) => a - b);
  }, [photos]);

  // Available years
  const years = useMemo(() => {
    const yrs = new Set<string>();
    photos.forEach(p => yrs.add(new Date(p.photo_date).getFullYear().toString()));
    return Array.from(yrs).sort().reverse();
  }, [photos]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    return photos.filter(p => {
      if (cycleFilter !== 'all' && (p as any).cycle_week !== parseInt(cycleFilter)) return false;
      if (yearFilter !== 'all' && new Date(p.photo_date).getFullYear().toString() !== yearFilter) return false;
      return true;
    });
  }, [photos, cycleFilter, yearFilter]);

  // All photo URLs for swipe navigation
  const allUrls = useMemo(() => 
    filteredPhotos.map(p => p.photo_urls[0] ? signedUrls[p.photo_urls[0]] : null).filter(Boolean) as string[],
    [filteredPhotos, signedUrls]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const selectedPhotos = photos.filter(p => selectedIds.includes(p.id));

  // Keyboard navigation for zoomed view
  useEffect(() => {
    if (!zoomedUrl) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && zoomedIndex > 0) {
        setZoomedIndex(zoomedIndex - 1);
        setZoomedUrl(allUrls[zoomedIndex - 1]);
      } else if (e.key === 'ArrowRight' && zoomedIndex < allUrls.length - 1) {
        setZoomedIndex(zoomedIndex + 1);
        setZoomedUrl(allUrls[zoomedIndex + 1]);
      } else if (e.key === 'Escape') {
        setZoomedUrl(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [zoomedUrl, zoomedIndex, allUrls]);

  const openZoom = (url: string) => {
    const idx = allUrls.indexOf(url);
    setZoomedIndex(idx >= 0 ? idx : 0);
    setZoomedUrl(url);
  };

  // Measurement delta between two compared photos
  const getDelta = (a: number | null, b: number | null) => {
    if (a == null || b == null) return null;
    const diff = a - b;
    return diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'max-h-[90vh]',
        fullscreen ? 'max-w-full h-screen m-0 rounded-none' : 'sm:max-w-2xl'
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>Progress Photo Timeline</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setFullscreen(!fullscreen)}
              >
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant={compareMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setCompareMode(!compareMode); setSelectedIds([]); }}
                className="gap-1"
              >
                <GitCompareArrows className="h-4 w-4" />
                {compareMode ? 'Exit Compare' : 'Compare'}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex gap-2 items-center">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={cycleFilter} onValueChange={setCycleFilter}>
            <SelectTrigger className="h-8 text-xs w-[120px]">
              <SelectValue placeholder="Cycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cycles</SelectItem>
              {cycleWeeks.map(w => (
                <SelectItem key={w} value={w.toString()}>Week {w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="h-8 text-xs w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="text-[10px] shrink-0">{filteredPhotos.length} photos</Badge>
        </div>

        {/* Compare view with measurement deltas */}
        {compareMode && selectedPhotos.length >= 2 && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 p-2 border rounded-lg bg-muted/30">
              {selectedPhotos.map(photo => {
                const url = photo.photo_urls[0] ? signedUrls[photo.photo_urls[0]] : null;
                return (
                  <div key={photo.id} className="text-center space-y-1">
                    {url ? (
                      <img src={url} alt="Progress" className="w-full aspect-square object-cover rounded-lg cursor-pointer" onClick={() => openZoom(url)} />
                    ) : (
                      <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center text-xs text-muted-foreground">No image</div>
                    )}
                    <p className="text-[10px] text-muted-foreground">{new Date(photo.photo_date).toLocaleDateString()}</p>
                    {photo.weight_lbs && <Badge variant="secondary" className="text-[10px]">{photo.weight_lbs} lbs</Badge>}
                  </div>
                );
              })}
            </div>
            {/* Measurement deltas */}
            {selectedPhotos.length === 2 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {getDelta(selectedPhotos[1].weight_lbs, selectedPhotos[0].weight_lbs) && (
                  <Badge variant="outline" className="text-[10px]">Weight: {getDelta(selectedPhotos[1].weight_lbs, selectedPhotos[0].weight_lbs)} lbs</Badge>
                )}
                {getDelta(selectedPhotos[1].arm_measurement, selectedPhotos[0].arm_measurement) && (
                  <Badge variant="outline" className="text-[10px]">Arm: {getDelta(selectedPhotos[1].arm_measurement, selectedPhotos[0].arm_measurement)}"</Badge>
                )}
                {getDelta(selectedPhotos[1].chest_measurement, selectedPhotos[0].chest_measurement) && (
                  <Badge variant="outline" className="text-[10px]">Chest: {getDelta(selectedPhotos[1].chest_measurement, selectedPhotos[0].chest_measurement)}"</Badge>
                )}
                {getDelta(selectedPhotos[1].waist_measurement, selectedPhotos[0].waist_measurement) && (
                  <Badge variant="outline" className="text-[10px]">Waist: {getDelta(selectedPhotos[1].waist_measurement, selectedPhotos[0].waist_measurement)}"</Badge>
                )}
                {getDelta(selectedPhotos[1].body_fat_percent, selectedPhotos[0].body_fat_percent) && (
                  <Badge variant="outline" className="text-[10px]">BF: {getDelta(selectedPhotos[1].body_fat_percent, selectedPhotos[0].body_fat_percent)}%</Badge>
                )}
              </div>
            )}
          </div>
        )}

        {compareMode && selectedPhotos.length < 2 && (
          <p className="text-xs text-muted-foreground text-center">Select 2-4 photos to compare</p>
        )}

        <ScrollArea className={fullscreen ? 'h-[calc(100vh-220px)]' : 'max-h-[60vh]'}>
          <div className="space-y-3 pr-2">
            {filteredPhotos.map((photo) => {
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
                        onClick={(e) => { if (!compareMode) { e.stopPropagation(); openZoom(url); } }}
                      />
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    {!compareMode && url && (
                      <button
                        className="absolute bottom-1 right-1 p-1 bg-background/80 rounded-full"
                        onClick={(e) => { e.stopPropagation(); openZoom(url); }}
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
            {filteredPhotos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No photos match the selected filters</p>
            )}
          </div>
        </ScrollArea>

        {/* Zoom overlay with swipe navigation */}
        {zoomedUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setZoomedUrl(null)}
          >
            <button className="absolute top-4 right-4 p-2 bg-background/80 rounded-full z-10" onClick={() => setZoomedUrl(null)}>
              <X className="h-5 w-5" />
            </button>
            {zoomedIndex > 0 && (
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full z-10"
                onClick={(e) => { e.stopPropagation(); setZoomedIndex(zoomedIndex - 1); setZoomedUrl(allUrls[zoomedIndex - 1]); }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {zoomedIndex < allUrls.length - 1 && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full z-10"
                onClick={(e) => { e.stopPropagation(); setZoomedIndex(zoomedIndex + 1); setZoomedUrl(allUrls[zoomedIndex + 1]); }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
            <img
              src={zoomedUrl}
              alt="Zoomed"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
              style={{ touchAction: 'pinch-zoom' }}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">
              {zoomedIndex + 1} / {allUrls.length} — Use arrows to navigate
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
