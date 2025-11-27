import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Circle, Rect, Line, IText } from "fabric";
import * as fabric from "fabric";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AnnotationToolbar } from "./AnnotationToolbar";

interface FrameAnnotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameDataUrl: string;
  onSave: (annotatedFrame: string) => void;
}

export type AnnotationTool = "select" | "draw" | "text" | "rectangle" | "circle" | "arrow";

export const FrameAnnotationDialog = ({
  open,
  onOpenChange,
  frameDataUrl,
  onSave,
}: FrameAnnotationDialogProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<AnnotationTool>("select");
  const [activeColor, setActiveColor] = useState("#FF0000");
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (!open || !frameDataUrl) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    console.log("Starting canvas initialization, frame data length:", frameDataUrl.length);

    let canvas: FabricCanvas | null = null;
    let cancelled = false;

    const init = () => {
      if (cancelled) return;

      const canvasElement = canvasRef.current;
      if (!canvasElement) {
        console.warn("Canvas ref not ready yet, retrying next frame");
        requestAnimationFrame(init);
        return;
      }

      const img = new Image();

      img.onload = () => {
        if (cancelled) return;
        try {
          console.log("Image loaded successfully:", img.width, "x", img.height);

          // Calculate max available dimensions for the canvas
          // Account for dialog padding, toolbar, header, footer
          const maxWidth = Math.min(window.innerWidth - 48, 850); // max dialog width minus padding
          const maxHeight = window.innerHeight * 0.55; // ~55vh for canvas area
          
          // Calculate scale factor to fit image within available space while maintaining aspect ratio
          const scaleX = maxWidth / img.width;
          const scaleY = maxHeight / img.height;
          const scale = Math.min(scaleX, scaleY, 1); // Never scale up, only down if needed
          
          const canvasWidth = Math.floor(img.width * scale);
          const canvasHeight = Math.floor(img.height * scale);
          
          console.log("Scaling canvas:", { 
            original: `${img.width}x${img.height}`,
            scaled: `${canvasWidth}x${canvasHeight}`,
            scale 
          });

          canvas = new FabricCanvas(canvasElement, {
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: "#f0f0f0",
          });

          // Scale the image to fit the canvas
          const fabricImg = new fabric.Image(img, {
            left: 0,
            top: 0,
            scaleX: scale,
            scaleY: scale,
            selectable: false,
            evented: false,
          });

          canvas.add(fabricImg);
          canvas.sendObjectToBack(fabricImg);
          canvas.renderAll();

          // Safely configure free drawing brush
          if (canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush.color = activeColor;
            canvas.freeDrawingBrush.width = 3;
          }

          setFabricCanvas(canvas);
          saveHistory(canvas);
          setIsLoading(false);
          console.log("Canvas initialized successfully");
        } catch (error) {
          console.error("Canvas initialization error:", error);
          const message = error instanceof Error ? error.message : String(error);
          setLoadError(`Failed to initialize canvas: ${message}`);
          setIsLoading(false);
        }
      };

      img.onerror = () => {
        if (cancelled) return;
        console.error("Image loading failed for frame", {
          snippet: frameDataUrl.slice(0, 40),
        });
        setLoadError("Failed to load frame image");
        setIsLoading(false);
      };

      img.src = frameDataUrl;
    };

    requestAnimationFrame(init);

    return () => {
      cancelled = true;
      canvas?.dispose();
    };
  }, [open, frameDataUrl, activeColor]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setFabricCanvas(null);
      setHistory([]);
      setHistoryStep(-1);
      setIsLoading(true);
      setLoadError(null);
    }
  }, [open]);

  // Update tool behavior
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "draw";
    
    if (activeTool === "draw" && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = 3;
    }

    // Save state after drawing
    if (activeTool === "draw") {
      const handlePathCreated = () => {
        saveHistory(fabricCanvas);
      };
      fabricCanvas.on("path:created", handlePathCreated);
      return () => {
        fabricCanvas.off("path:created", handlePathCreated);
      };
    }
  }, [activeTool, activeColor, fabricCanvas]);

  const saveHistory = (canvas: FabricCanvas) => {
    const json = JSON.stringify(canvas.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyStep + 1);
      newHistory.push(json);
      return newHistory;
    });
    setHistoryStep(prev => prev + 1);
  };

  const handleUndo = () => {
    if (!fabricCanvas || historyStep <= 0) return;
    
    const newStep = historyStep - 1;
    setHistoryStep(newStep);
    fabricCanvas.loadFromJSON(history[newStep], () => {
      fabricCanvas.renderAll();
    });
  };

  const handleRedo = () => {
    if (!fabricCanvas || historyStep >= history.length - 1) return;
    
    const newStep = historyStep + 1;
    setHistoryStep(newStep);
    fabricCanvas.loadFromJSON(history[newStep], () => {
      fabricCanvas.renderAll();
    });
  };

  const handleToolClick = (tool: AnnotationTool) => {
    setActiveTool(tool);

    if (!fabricCanvas) return;

    if (tool === "text") {
      const text = new IText("Label", {
        left: 100,
        top: 100,
        fill: activeColor,
        fontSize: 24,
        fontWeight: "bold",
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
        strokeWidth: 3,
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
        strokeWidth: 3,
        radius: 50,
      });
      fabricCanvas.add(circle);
      saveHistory(fabricCanvas);
    } else if (tool === "arrow") {
      const arrow = createArrow(150, 150, 250, 250, activeColor);
      fabricCanvas.add(arrow);
      saveHistory(fabricCanvas);
    }
  };

  const createArrow = (x1: number, y1: number, x2: number, y2: number, color: string) => {
    const line = new Line([x1, y1, x2, y2], {
      stroke: color,
      strokeWidth: 3,
    });
    
    return line;
  };

  const handlePresetLabel = (label: string) => {
    if (!fabricCanvas) return;

    const text = new IText(label, {
      left: 150,
      top: 150,
      fill: activeColor,
      fontSize: 20,
      fontWeight: "bold",
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      padding: 5,
    });
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    saveHistory(fabricCanvas);
    toast.success(`Added "${label}" label`);
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    
    const objects = fabricCanvas.getObjects();
    // Keep only the first object (background image)
    objects.slice(1).forEach(obj => {
      fabricCanvas.remove(obj);
    });
    fabricCanvas.renderAll();
    saveHistory(fabricCanvas);
    toast.info("Canvas cleared");
  };

  const handleSave = () => {
    if (!fabricCanvas) return;

    // Export at higher resolution for quality
    const annotatedFrame = fabricCanvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 2, // Export at 2x for better quality
    });
    
    onSave(annotatedFrame);
    onOpenChange(false);
    toast.success("Annotations saved!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-[900px] max-h-[90vh] overflow-y-auto overflow-x-hidden p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle>Annotate Frame</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <AnnotationToolbar
            activeTool={activeTool}
            activeColor={activeColor}
            onToolClick={handleToolClick}
            onColorChange={setActiveColor}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClear={handleClear}
            onPresetLabel={handlePresetLabel}
            canUndo={historyStep > 0}
            canRedo={historyStep < history.length - 1}
          />

          <div className="relative border rounded-lg overflow-hidden bg-muted/20 flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
            <canvas ref={canvasRef} />
            
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">Loading frame...</p>
                </div>
              </div>
            )}

            {loadError && (
              <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 backdrop-blur-sm border border-destructive">
                <p className="text-sm text-destructive">{loadError}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Annotations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
