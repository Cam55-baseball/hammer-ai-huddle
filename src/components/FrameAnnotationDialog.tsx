import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Circle, Rect, Line, IText } from "fabric";
import * as fabric from "fabric";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AnnotationToolbar } from "./AnnotationToolbar";
import { ZoomIn } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FrameAnnotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameDataUrl: string;
  onSave: (annotatedFrame: string) => void;
}

export type AnnotationTool = "select" | "draw" | "eraser" | "text" | "rectangle" | "circle" | "arrow" | "pan";

export const FrameAnnotationDialog = ({
  open,
  onOpenChange,
  frameDataUrl,
  onSave,
}: FrameAnnotationDialogProps) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<AnnotationTool>("select");
  const [activeColor, setActiveColor] = useState("#FF0000");
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState<{ x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoomOnPinch, setInitialZoomOnPinch] = useState<number>(1);
  const [isPinching, setIsPinching] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingTextValue, setEditingTextValue] = useState('');
  const hiddenInputRef = useRef<HTMLInputElement>(null);

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

          // Configure touch handling for mobile
          canvas.allowTouchScrolling = false;
          if (canvas.upperCanvasEl) {
            canvas.upperCanvasEl.style.touchAction = 'none';
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
      setZoomLevel(1);
      setIsPanning(false);
      setLastPanPosition(null);
      setInitialPinchDistance(null);
      setIsPinching(false);
      setIsEditingText(false);
      setEditingTextValue('');
    }
  }, [open]);

  // Handle text editing events for mobile keyboard
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleTextEditingEntered = (e: any) => {
      const target = e.target;
      if (target && target.type === 'i-text') {
        setIsEditingText(true);
        setEditingTextValue(target.text || '');
        
        // Focus the input to trigger mobile keyboard
        setTimeout(() => {
          hiddenInputRef.current?.focus();
        }, 100);
      }
    };

    const handleTextEditingExited = () => {
      setIsEditingText(false);
    };

    fabricCanvas.on('text:editing:entered', handleTextEditingEntered);
    fabricCanvas.on('text:editing:exited', handleTextEditingExited);

    return () => {
      fabricCanvas.off('text:editing:entered', handleTextEditingEntered);
      fabricCanvas.off('text:editing:exited', handleTextEditingExited);
    };
  }, [fabricCanvas]);

  // Update tool behavior
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "draw";
    
    // When in draw mode, ensure touch events can reach the canvas
    if (activeTool === "draw") {
      if (fabricCanvas.upperCanvasEl) {
        fabricCanvas.upperCanvasEl.style.touchAction = 'none';
        fabricCanvas.upperCanvasEl.style.pointerEvents = 'auto';
      }
      if (fabricCanvas.lowerCanvasEl) {
        fabricCanvas.lowerCanvasEl.style.touchAction = 'none';
      }
      // Also set on the wrapper element
      if (fabricCanvas.wrapperEl) {
        fabricCanvas.wrapperEl.style.touchAction = 'none';
      }
      
      // Ensure the brush is configured
      if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = activeColor;
        fabricCanvas.freeDrawingBrush.width = 3;
      }
    }
    
    // Disable object selection in pan mode
    if (activeTool === "pan") {
      fabricCanvas.selection = false;
      fabricCanvas.forEachObject((obj) => {
        obj.selectable = false;
      });
    } else {
      fabricCanvas.selection = true;
      fabricCanvas.forEachObject((obj, index) => {
        // Keep background image unselectable
        obj.selectable = index > 0;
      });
    }
    
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

  // Native touch event forwarding for draw mode on mobile
  useEffect(() => {
    if (!fabricCanvas || activeTool !== 'draw') return;
    
    const upperCanvas = fabricCanvas.upperCanvasEl;
    const wrapperEl = fabricCanvas.wrapperEl;
    if (!upperCanvas) return;
    
    // Convert touch events to pointer events for Fabric.js drawing
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        e.stopPropagation();
        
        // Haptic feedback when starting to draw
        if (navigator.vibrate) {
          navigator.vibrate(5);
        }
        
        const touch = e.touches[0];
        const rect = upperCanvas.getBoundingClientRect();
        const scaleX = upperCanvas.width / rect.width;
        const scaleY = upperCanvas.height / rect.height;
        
        // Create synthetic mouse event for Fabric.js
        const mouseEvent = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          clientX: touch.clientX,
          clientY: touch.clientY,
          button: 0
        });
        upperCanvas.dispatchEvent(mouseEvent);
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        e.stopPropagation();
        
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX: touch.clientX,
          clientY: touch.clientY,
          button: 0
        });
        upperCanvas.dispatchEvent(mouseEvent);
      }
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const mouseEvent = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        button: 0
      });
      upperCanvas.dispatchEvent(mouseEvent);
    };
    
    // Attach to both upper canvas and wrapper for complete coverage
    upperCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    upperCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    upperCanvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    if (wrapperEl) {
      wrapperEl.addEventListener('touchstart', handleTouchStart, { passive: false });
      wrapperEl.addEventListener('touchmove', handleTouchMove, { passive: false });
      wrapperEl.addEventListener('touchend', handleTouchEnd, { passive: false });
    }
    
    return () => {
      upperCanvas.removeEventListener('touchstart', handleTouchStart);
      upperCanvas.removeEventListener('touchmove', handleTouchMove);
      upperCanvas.removeEventListener('touchend', handleTouchEnd);
      
      if (wrapperEl) {
        wrapperEl.removeEventListener('touchstart', handleTouchStart);
        wrapperEl.removeEventListener('touchmove', handleTouchMove);
        wrapperEl.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [fabricCanvas, activeTool]);

  // Eraser/Delete functionality
  const handleDeleteSelected = () => {
    if (!fabricCanvas) return;
    
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length === 0) {
      toast.info(t('annotation.selectToDelete'));
      return;
    }
    
    // Don't delete the background image (first object)
    activeObjects.forEach(obj => {
      const allObjects = fabricCanvas.getObjects();
      if (allObjects.indexOf(obj) > 0) {
        fabricCanvas.remove(obj);
      }
    });
    
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
    saveHistory(fabricCanvas);
    toast.success(t('annotation.deleted'));
  };

  // Keyboard delete handler
  useEffect(() => {
    if (!fabricCanvas) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't handle if editing text
        if (isEditingText) return;
        
        handleDeleteSelected();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fabricCanvas, isEditingText]);

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
    toast.success(t('annotation.labelAdded', { label }));
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
    toast.info(t('annotation.canvasCleared'));
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
    toast.success(t('annotation.annotationsSaved'));
  };

  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.min(zoomLevel + 0.25, 4); // Max 400%
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
    setZoomLevel(newZoom);
  };

  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(zoomLevel - 0.25, 0.5); // Min 50%
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
    setZoomLevel(newZoom);
  };

  const handleResetZoom = () => {
    if (!fabricCanvas) return;
    fabricCanvas.setZoom(1);
    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]); // Reset pan as well
    fabricCanvas.renderAll();
    setZoomLevel(1);
  };

  // Helper functions for pinch-to-zoom
  const getDistanceBetweenTouches = (touches: TouchList): number => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const getMidpointBetweenTouches = (touches: TouchList): { x: number; y: number } => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  // Handle pan mode
  useEffect(() => {
    if (!fabricCanvas || activeTool !== "pan") return;

    const handleMouseDown = (opt: fabric.TPointerEventInfo) => {
      setIsPanning(true);
      fabricCanvas.selection = false;
      const evt = opt.e as MouseEvent | TouchEvent;
      const point = 'touches' in evt ? evt.touches[0] : evt;
      setLastPanPosition({ x: point.clientX, y: point.clientY });
      fabricCanvas.setCursor('grabbing');
    };

    const handleMouseMove = (opt: fabric.TPointerEventInfo) => {
      if (!isPanning || !lastPanPosition) return;
      const evt = opt.e as MouseEvent | TouchEvent;
      const point = 'touches' in evt ? evt.touches[0] : evt;
      
      const deltaX = point.clientX - lastPanPosition.x;
      const deltaY = point.clientY - lastPanPosition.y;
      
      const vpt = fabricCanvas.viewportTransform;
      if (vpt) {
        vpt[4] += deltaX;
        vpt[5] += deltaY;
        fabricCanvas.setViewportTransform(vpt);
      }
      
      setLastPanPosition({ x: point.clientX, y: point.clientY });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
      setLastPanPosition(null);
      fabricCanvas.selection = true;
      fabricCanvas.setCursor('grab');
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:up', handleMouseUp);

    // Set initial cursor for pan mode
    fabricCanvas.setCursor('grab');
    fabricCanvas.defaultCursor = 'grab';

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:up', handleMouseUp);
      fabricCanvas.defaultCursor = 'default';
    };
  }, [activeTool, fabricCanvas, isPanning, lastPanPosition]);

  // Handle pinch-to-zoom gesture
  useEffect(() => {
    // Don't attach pinch handlers in draw mode - let Fabric.js handle touch
    if (!fabricCanvas || !containerRef.current || activeTool === 'draw') return;

    const container = containerRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Two-finger pinch detected
        e.preventDefault();
        const distance = getDistanceBetweenTouches(e.touches);
        setInitialPinchDistance(distance);
        setInitialZoomOnPinch(zoomLevel);
        setIsPinching(true);
        
        // Haptic feedback on pinch start
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistance !== null) {
        e.preventDefault();
        
        const currentDistance = getDistanceBetweenTouches(e.touches);
        const scale = currentDistance / initialPinchDistance;
        const newZoom = Math.max(0.5, Math.min(4, initialZoomOnPinch * scale));
        
        // Get the midpoint between fingers to zoom towards
        const midpoint = getMidpointBetweenTouches(e.touches);
        const containerRect = container.getBoundingClientRect();
        const point = new fabric.Point(
          midpoint.x - containerRect.left,
          midpoint.y - containerRect.top
        );
        
        // Apply zoom centered on pinch midpoint
        fabricCanvas.zoomToPoint(point, newZoom);
        fabricCanvas.renderAll();
        setZoomLevel(newZoom);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isPinching) {
        setInitialPinchDistance(null);
        setIsPinching(false);
        
        // Haptic feedback on pinch end
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [fabricCanvas, initialPinchDistance, initialZoomOnPinch, isPinching, zoomLevel, activeTool]);

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
            zoomLevel={zoomLevel}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            onDeleteSelected={handleDeleteSelected}
          />

          <div 
            ref={containerRef}
            className={`relative border rounded-lg ${activeTool === 'draw' ? 'overflow-hidden' : 'overflow-auto'} bg-muted/20 flex items-center justify-center min-h-[300px] sm:min-h-[400px] ${activeTool === 'draw' ? '' : 'touch-none'} ${activeTool === 'pan' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''} ${activeTool === 'draw' ? 'ring-2 ring-primary/50' : ''}`}
          >
            {/* Draw mode indicator */}
            {activeTool === 'draw' && (
              <div className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs font-medium shadow-md animate-in fade-in">
                {t('annotation.drawMode')}
              </div>
            )}
            <canvas ref={canvasRef} className={activeTool === 'draw' ? '' : 'touch-none'} style={{ touchAction: activeTool === 'draw' ? 'none' : 'auto' }} />
            
            {/* Pinch-to-zoom visual indicator */}
            {isPinching && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                <ZoomIn className="h-4 w-4" />
                <span className="text-sm font-semibold">{Math.round(zoomLevel * 100)}%</span>
              </div>
            )}
            
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-sm text-muted-foreground">{t('annotation.loadingFrame')}</p>
                </div>
              </div>
            )}

            {loadError && (
              <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 backdrop-blur-sm border border-destructive">
                <p className="text-sm text-destructive">{loadError}</p>
              </div>
            )}
            
            {/* Mobile text editing overlay input */}
            {isEditingText && (
              <input
                ref={hiddenInputRef}
                type="text"
                value={editingTextValue}
                onChange={(e) => {
                  setEditingTextValue(e.target.value);
                  const activeObj = fabricCanvas?.getActiveObject();
                  if (activeObj && activeObj.type === 'i-text') {
                    activeObj.set('text', e.target.value);
                    fabricCanvas?.renderAll();
                  }
                }}
                onBlur={() => {
                  setIsEditingText(false);
                  const activeObj = fabricCanvas?.getActiveObject();
                  if (activeObj && activeObj.type === 'i-text') {
                    (activeObj as any).exitEditing?.();
                  }
                  if (fabricCanvas) {
                    saveHistory(fabricCanvas);
                  }
                }}
                className="absolute bottom-0 left-0 right-0 p-3 bg-background border-t text-base z-50"
                style={{ fontSize: '16px' }}
                autoFocus
                placeholder={t('annotation.enterText')}
              />
            )}
          </div>
        </div>

      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSave} className="w-full sm:w-auto">
          {t('annotation.saveAnnotations')}
        </Button>
      </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
