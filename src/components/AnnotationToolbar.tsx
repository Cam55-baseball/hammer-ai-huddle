import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  MousePointer2,
  Pencil,
  Type,
  Square,
  Circle as CircleIcon,
  ArrowRight,
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Hand,
} from "lucide-react";
import { AnnotationTool } from "./FrameAnnotationDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AnnotationToolbarProps {
  activeTool: AnnotationTool;
  activeColor: string;
  onToolClick: (tool: AnnotationTool) => void;
  onColorChange: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onPresetLabel: (label: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

const PRESET_LABELS = [
  "Back Elbow",
  "Front Shoulder",
  "Hip Rotation",
  "Contact Point",
  "Head Position",
  "Release Point",
  "Follow Through",
  "Arm Angle",
  "Stride Length",
];

const COLOR_PALETTE = [
  { name: "Red", value: "#FF0000" },
  { name: "Blue", value: "#0066FF" },
  { name: "Green", value: "#00CC00" },
  { name: "Yellow", value: "#FFD700" },
  { name: "Orange", value: "#FF6600" },
  { name: "Purple", value: "#9933FF" },
  { name: "White", value: "#FFFFFF" },
  { name: "Black", value: "#000000" },
];

export const AnnotationToolbar = ({
  activeTool,
  activeColor,
  onToolClick,
  onColorChange,
  onUndo,
  onRedo,
  onClear,
  onPresetLabel,
  canUndo,
  canRedo,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: AnnotationToolbarProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg border">
      {/* Drawing Tools */}
      <div className="flex gap-1">
        <Button
          variant={activeTool === "select" ? "default" : "outline"}
          size="sm"
          onClick={() => onToolClick("select")}
          title="Select"
        >
          <MousePointer2 className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "draw" ? "default" : "outline"}
          size="sm"
          onClick={() => onToolClick("draw")}
          title="Freehand Draw"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "text" ? "default" : "outline"}
          size="sm"
          onClick={() => onToolClick("text")}
          title="Add Text"
        >
          <Type className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Shape Tools */}
      <div className="flex gap-1">
        <Button
          variant={activeTool === "rectangle" ? "default" : "outline"}
          size="sm"
          onClick={() => onToolClick("rectangle")}
          title="Rectangle"
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "circle" ? "default" : "outline"}
          size="sm"
          onClick={() => onToolClick("circle")}
          title="Circle"
        >
          <CircleIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "arrow" ? "default" : "outline"}
          size="sm"
          onClick={() => onToolClick("arrow")}
          title="Arrow"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Color Picker */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" title="Select Color">
            <div
              className="w-4 h-4 rounded border-2 border-border"
              style={{ backgroundColor: activeColor }}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {COLOR_PALETTE.map((color) => (
            <DropdownMenuItem
              key={color.value}
              onClick={() => onColorChange(color.value)}
            >
              <div
                className="w-4 h-4 rounded border mr-2"
                style={{ backgroundColor: color.value }}
              />
              {color.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Preset Labels */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Preset Labels
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {PRESET_LABELS.map((label) => (
            <DropdownMenuItem key={label} onClick={() => onPresetLabel(label)}>
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-8" />

      {/* History Controls */}
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant={activeTool === "pan" ? "default" : "outline"}
          size="sm"
          onClick={() => onToolClick("pan")}
          disabled={zoomLevel <= 1}
          title="Pan (drag to move around when zoomed)"
        >
          <Hand className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onZoomOut}
          disabled={zoomLevel <= 0.5}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium min-w-[40px] text-center">
          {Math.round(zoomLevel * 100)}%
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onZoomIn}
          disabled={zoomLevel >= 4}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        {zoomLevel !== 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResetZoom}
            title="Reset Zoom"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* Clear */}
      <Button
        variant="outline"
        size="sm"
        onClick={onClear}
        title="Clear All Annotations"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
