import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface CapturedFrame {
  dataUrl: string;
  timestamp: number;
  selectedForAnalysis: boolean;
  annotated?: boolean;
}

interface FrameComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frames: CapturedFrame[];
  onDownload: (frame: CapturedFrame, index: number) => void;
}

export const FrameComparisonDialog = ({
  open,
  onOpenChange,
  frames,
  onDownload,
}: FrameComparisonDialogProps) => {
  const { t } = useTranslation();
  const [zoomLevel, setZoomLevel] = useState(1);
  const [syncScroll, setSyncScroll] = useState(true);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  const handleDownloadAll = () => {
    frames.forEach((frame, index) => {
      setTimeout(() => onDownload(frame, index), index * 200);
    });
  };

  if (frames.length < 2) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col analysis-zoomable">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {t('realTimePlayback.compareFrames', 'Compare Frames')}
              <span className="text-sm font-normal text-muted-foreground">
                ({frames.length} {t('realTimePlayback.framesSelected', 'frames')})
              </span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={zoomLevel <= 0.5}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={zoomLevel >= 3}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleResetZoom}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-2" />
              <Button variant="outline" size="sm" onClick={handleDownloadAll}>
                <Download className="h-4 w-4 mr-2" />
                {t('realTimePlayback.downloadAll', 'Download All')}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div 
            className={`grid gap-4 p-4 ${
              frames.length === 2 ? 'grid-cols-2' : 
              frames.length === 3 ? 'grid-cols-3' : 
              'grid-cols-2 lg:grid-cols-4'
            }`}
          >
            {frames.map((frame, index) => (
              <div key={index} className="relative group">
                <div className="absolute top-2 left-2 z-10 bg-black/70 text-white px-2 py-1 rounded text-sm font-medium">
                  {t('realTimePlayback.frame', 'Frame')} {index + 1}
                </div>
                <div className="absolute top-2 right-2 z-10 bg-black/70 text-white px-2 py-1 rounded text-xs">
                  {frame.timestamp.toFixed(2)}s
                </div>
                <div 
                  className="overflow-auto rounded-lg border bg-muted/30"
                  style={{ maxHeight: '60vh' }}
                >
                  <img 
                    src={frame.dataUrl} 
                    alt={`Frame ${index + 1}`}
                    className="w-full h-auto transition-transform origin-top-left"
                    style={{ transform: `scale(${zoomLevel})` }}
                  />
                </div>
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onDownload(frame, index)}
                    className="shadow-lg"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    {t('common.download', 'Download')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison tips */}
        <div className="flex-shrink-0 border-t pt-3 px-4 pb-2">
          <p className="text-xs text-muted-foreground text-center">
            {t('realTimePlayback.comparisonTip', 'Tip: Use zoom controls to examine details. Click individual frames to download.')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
