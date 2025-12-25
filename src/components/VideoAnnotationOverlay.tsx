import { useState, useRef, useEffect, useCallback, RefObject } from "react";
import { Canvas as FabricCanvas, Circle, Rect, Line, IText, PencilBrush } from "fabric";
import * as fabric from "fabric";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Pencil, Square, Circle as CircleIcon, ArrowRight, Type, 
  MousePointer, Trash2, RotateCcw, Check, X, Palette
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface VideoAnnotation {
  id: string;
  startTime: number;
  endTime: number;
  objects: any[];
}

interface VideoAnnotationOverlayProps {
  videoRef: RefObject<HTMLVideoElement>;
  isActive: boolean;
  onClose: () => void;
  annotations: VideoAnnotation[];
  onAnnotationsChange: (annotations: VideoAnnotation[]) => void;
  currentTime: number;
  onSaveFrame?: (dataUrl: string) => void;
}

type AnnotationTool = "select" | "draw" | "rectangle" | "circle" | "arrow" | "text";

const COLORS = [
  "#FF0000", "#FF6B00", "#FFD600", "#00FF00", 
  "#00D4FF", "#0066FF", "#8B00FF", "#FF00FF", "#FFFFFF", "#000000"
];

export const VideoAnnotationOverlay = ({
  videoRef,
  isActive,
  onClose,
  annotations,
  onAnnotationsChange,
  currentTime,
  onSaveFrame
}: VideoAnnotationOverlayProps) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<AnnotationTool>("draw");
  const [activeColor, setActiveColor] = useState("#FF0000");
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Initialize canvas when overlay becomes active
  useEffect(() => {
    if (!isActive || !canvasRef.current || !videoRef.current) return;

    const video = videoRef.current;
    const videoRect = video.getBoundingClientRect();
    
    // Create canvas matching video dimensions
    const canvas = new FabricCanvas(canvasRef.current, {
      width: videoRect.width,
      height: videoRect.height,
      backgroundColor: "transparent",
      selection: true,
    });

    // Configure for drawing
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = 4;
    canvas.isDrawingMode = activeTool === "draw";

    // Configure touch handling
    canvas.allowTouchScrolling = false;
    if (canvas.upperCanvasEl) {
      canvas.upperCanvasEl.style.touchAction = 'none';
    }

    setFabricCanvas(canvas);
    saveHistory(canvas);

    // Handle window resize
    const handleResize = () => {
      if (!video) return;
      const rect = video.getBoundingClientRect();
      canvas.setDimensions({ width: rect.width, height: rect.height });
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, [isActive, videoRef]);

  // Update tool behavior
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "draw";
    
    if (activeTool === "draw" && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = 4;
    }

    // Save state after drawing
    if (activeTool === "draw") {
      const handlePathCreated = () => saveHistory(fabricCanvas);
      fabricCanvas.on("path:created", handlePathCreated);
      return () => {
        fabricCanvas.off("path:created", handlePathCreated);
      };
    }
  }, [activeTool, activeColor, fabricCanvas]);

  // Prevent touch scrolling when drawing
  useEffect(() => {
    if (!fabricCanvas || activeTool !== 'draw') return;
    
    const upperCanvas = fabricCanvas.upperCanvasEl;
    if (!upperCanvas) return;
    
    const preventDefaultHandler = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
      }
    };
    
    upperCanvas.addEventListener('touchstart', preventDefaultHandler, { passive: false });
    upperCanvas.addEventListener('touchmove', preventDefaultHandler, { passive: false });
    
    return () => {
      upperCanvas.removeEventListener('touchstart', preventDefaultHandler);
      upperCanvas.removeEventListener('touchmove', preventDefaultHandler);
    };
  }, [fabricCanvas, activeTool]);

  const saveHistory = (canvas: FabricCanvas) => {
    const json = JSON.stringify(canvas.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyStep + 1);
      newHistory.push(json);
      return newHistory;
    });
    setHistoryStep(prev => prev + 1);
  };

  const handleUndo = useCallback(() => {
    if (!fabricCanvas || historyStep <= 0) return;
    
    const newStep = historyStep - 1;
    setHistoryStep(newStep);
    fabricCanvas.loadFromJSON(history[newStep], () => {
      fabricCanvas.renderAll();
    });
  }, [fabricCanvas, history, historyStep]);

  const handleToolClick = useCallback((tool: AnnotationTool) => {
    setActiveTool(tool);
    if (!fabricCanvas) return;

    if (tool === "text") {
      const text = new IText("Label", {
        left: 100,
        top: 100,
        fill: activeColor,
        fontSize: 24,
        fontWeight: "bold",
        stroke: "#000000",
        strokeWidth: 0.5,
      });
      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      saveHistory(fabricCanvas);
    } else if (tool === "rectangle") {
      const rect = new Rect({
        left: 100,
        top: 100,
        fill: "transparent",
        stroke: activeColor,
        strokeWidth: 4,
        width: 150,
        height: 100,
      });
      fabricCanvas.add(rect);
      saveHistory(fabricCanvas);
    } else if (tool === "circle") {
      const circle = new Circle({
        left: 100,
        top: 100,
        fill: "transparent",
        stroke: activeColor,
        strokeWidth: 4,
        radius: 50,
      });
      fabricCanvas.add(circle);
      saveHistory(fabricCanvas);
    } else if (tool === "arrow") {
      // Create arrow using line with triangle
      const line = new Line([100, 100, 200, 200], {
        stroke: activeColor,
        strokeWidth: 4,
        strokeLineCap: 'round',
      });
      fabricCanvas.add(line);
      saveHistory(fabricCanvas);
    }
  }, [fabricCanvas, activeColor]);

  const handleClear = useCallback(() => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "transparent";
    fabricCanvas.renderAll();
    saveHistory(fabricCanvas);
    toast.info(t('realTimePlayback.annotationsCleared', 'Annotations cleared'));
  }, [fabricCanvas, t]);

  const handleDeleteSelected = useCallback(() => {
    if (!fabricCanvas) return;
    
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length === 0) {
      toast.info(t('annotation.selectToDelete', 'Select an object to delete'));
      return;
    }
    
    activeObjects.forEach(obj => {
      fabricCanvas.remove(obj);
    });
    
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
    saveHistory(fabricCanvas);
  }, [fabricCanvas, t]);

  const handleSaveAnnotation = useCallback(() => {
    if (!fabricCanvas || !videoRef.current) return;

    const video = videoRef.current;
    
    // Create a combined canvas with video frame + annotations
    const combinedCanvas = document.createElement('canvas');
    combinedCanvas.width = video.videoWidth;
    combinedCanvas.height = video.videoHeight;
    const ctx = combinedCanvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0, combinedCanvas.width, combinedCanvas.height);

    // Get canvas dimensions for scaling
    const scaleX = video.videoWidth / fabricCanvas.getWidth();
    const scaleY = video.videoHeight / fabricCanvas.getHeight();

    // Draw annotations scaled to video resolution
    const annotationImage = new Image();
    annotationImage.onload = () => {
      ctx.drawImage(annotationImage, 0, 0, combinedCanvas.width, combinedCanvas.height);
      const dataUrl = combinedCanvas.toDataURL('image/png');
      
      if (onSaveFrame) {
        onSaveFrame(dataUrl);
        toast.success(t('realTimePlayback.frameWithAnnotationsSaved', 'Frame with annotations saved!'));
      }
    };
    annotationImage.src = fabricCanvas.toDataURL({
      format: 'png',
      multiplier: scaleX,
    });
  }, [fabricCanvas, videoRef, onSaveFrame, t]);

  const handleDone = useCallback(() => {
    // Save current annotations to the annotation list
    if (fabricCanvas) {
      const objects = fabricCanvas.getObjects();
      if (objects.length > 0) {
        const newAnnotation: VideoAnnotation = {
          id: Date.now().toString(),
          startTime: currentTime,
          endTime: currentTime + 3, // Visible for 3 seconds by default
          objects: fabricCanvas.toJSON().objects,
        };
        onAnnotationsChange([...annotations, newAnnotation]);
      }
    }
    onClose();
  }, [fabricCanvas, currentTime, annotations, onAnnotationsChange, onClose]);

  if (!isActive) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 z-50"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Canvas overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
      />

      {/* Annotation mode indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-primary/90 text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-lg">
        <Pencil className="h-4 w-4" />
        {t('realTimePlayback.annotationMode', 'Annotation Mode')}
      </div>

      {/* Toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-xl bg-background/95 backdrop-blur shadow-lg border">
        {/* Tool buttons */}
        <Button
          variant={activeTool === "select" ? "default" : "ghost"}
          size="icon"
          onClick={() => setActiveTool("select")}
          className="h-10 w-10"
          title={t('annotation.select', 'Select')}
        >
          <MousePointer className="h-5 w-5" />
        </Button>
        <Button
          variant={activeTool === "draw" ? "default" : "ghost"}
          size="icon"
          onClick={() => setActiveTool("draw")}
          className="h-10 w-10"
          title={t('annotation.freehand', 'Freehand')}
        >
          <Pencil className="h-5 w-5" />
        </Button>
        <Button
          variant={activeTool === "rectangle" ? "default" : "ghost"}
          size="icon"
          onClick={() => handleToolClick("rectangle")}
          className="h-10 w-10"
          title={t('annotation.rectangle', 'Rectangle')}
        >
          <Square className="h-5 w-5" />
        </Button>
        <Button
          variant={activeTool === "circle" ? "default" : "ghost"}
          size="icon"
          onClick={() => handleToolClick("circle")}
          className="h-10 w-10"
          title={t('annotation.circle', 'Circle')}
        >
          <CircleIcon className="h-5 w-5" />
        </Button>
        <Button
          variant={activeTool === "arrow" ? "default" : "ghost"}
          size="icon"
          onClick={() => handleToolClick("arrow")}
          className="h-10 w-10"
          title={t('annotation.arrow', 'Arrow')}
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
        <Button
          variant={activeTool === "text" ? "default" : "ghost"}
          size="icon"
          onClick={() => handleToolClick("text")}
          className="h-10 w-10"
          title={t('annotation.text', 'Text')}
        >
          <Type className="h-5 w-5" />
        </Button>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Color picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              title={t('annotation.color', 'Color')}
            >
              <div 
                className="h-6 w-6 rounded-full border-2 border-background shadow-sm"
                style={{ backgroundColor: activeColor }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 bg-background border" align="center" side="top">
            <div className="grid grid-cols-5 gap-1">
              {COLORS.map(color => (
                <button
                  key={color}
                  className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    activeColor === color ? 'border-foreground ring-2 ring-primary' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setActiveColor(color)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Actions */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleUndo}
          disabled={historyStep <= 0}
          className="h-10 w-10"
          title={t('annotation.undo', 'Undo')}
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDeleteSelected}
          className="h-10 w-10"
          title={t('annotation.delete', 'Delete')}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="h-10 w-10 text-destructive hover:text-destructive"
          title={t('realTimePlayback.clearAnnotations', 'Clear All')}
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Save and Done */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveAnnotation}
          className="h-10 px-3"
        >
          {t('realTimePlayback.saveWithAnnotations', 'Save Frame')}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleDone}
          className="h-10 px-3 gap-1"
        >
          <Check className="h-4 w-4" />
          {t('common.done', 'Done')}
        </Button>
      </div>
    </div>
  );
};
