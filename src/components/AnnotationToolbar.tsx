import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  MousePointer2,
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
  Eraser,
  Pencil,
} from "lucide-react";
import { AnnotationTool } from "./FrameAnnotationDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";

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
  onDeleteSelected: () => void;
}

const PRESET_LABEL_KEYS = [
  "backElbow",
  "frontShoulder",
  "hipRotation",
  "contactPoint",
  "headPosition",
  "releasePoint",
  "followThrough",
  "armAngle",
  "strideLength",
];

const COLOR_PALETTE_KEYS = [
  { key: "red", value: "#FF0000" },
  { key: "blue", value: "#0066FF" },
  { key: "green", value: "#00CC00" },
  { key: "yellow", value: "#FFD700" },
  { key: "orange", value: "#FF6600" },
  { key: "purple", value: "#9933FF" },
  { key: "white", value: "#FFFFFF" },
  { key: "black", value: "#000000" },
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
  onDeleteSelected,
}: AnnotationToolbarProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 p-2 sm:p-3 bg-muted/30 rounded-lg border max-w-full overflow-x-hidden">
      {/* Row 1: Drawing & Shape Tools + Color */}
      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
        {/* Drawing Tools */}
        <div className="flex gap-1">
          <Button
            variant={activeTool === "select" ? "default" : "outline"}
            size="sm"
            onClick={() => onToolClick("select")}
            title={t('annotation.tools.select')}
          >
            <MousePointer2 className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === "draw" ? "default" : "outline"}
            size="sm"
            onClick={() => onToolClick("draw")}
            title={t('annotation.tools.draw')}
            className={activeTool === "draw" ? "ring-2 ring-primary ring-offset-1" : ""}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onToolClick("select");
              onDeleteSelected();
            }}
            title={t('annotation.tools.deleteSelected')}
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => onToolClick("text")}
            title={t('annotation.tools.addText')}
          >
            <Type className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-8 hidden sm:block" />

        {/* Shape Tools */}
        <div className="flex gap-1">
          <Button
            variant={activeTool === "rectangle" ? "default" : "outline"}
            size="sm"
            onClick={() => onToolClick("rectangle")}
            title={t('annotation.tools.rectangle')}
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === "circle" ? "default" : "outline"}
            size="sm"
            onClick={() => onToolClick("circle")}
            title={t('annotation.tools.circle')}
          >
            <CircleIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === "arrow" ? "default" : "outline"}
            size="sm"
            onClick={() => onToolClick("arrow")}
            title={t('annotation.tools.arrow')}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-8 hidden sm:block" />

        {/* Color Picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" title={t('annotation.tools.selectColor')}>
              <div
                className="w-4 h-4 rounded border-2 border-border"
                style={{ backgroundColor: activeColor }}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {COLOR_PALETTE_KEYS.map((color) => (
              <DropdownMenuItem
                key={color.value}
                onClick={() => onColorChange(color.value)}
              >
                <div
                  className="w-4 h-4 rounded border mr-2"
                  style={{ backgroundColor: color.value }}
                />
                {t(`annotation.colors.${color.key}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Row 2: Presets, History, Zoom, Clear */}
      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
        {/* Preset Labels */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" title={t('annotation.tools.presetLabels')}>
              <Type className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('annotation.tools.presetLabels')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {PRESET_LABEL_KEYS.map((labelKey) => (
              <DropdownMenuItem key={labelKey} onClick={() => onPresetLabel(t(`annotation.presets.${labelKey}`))}>
                {t(`annotation.presets.${labelKey}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-8 hidden sm:block" />

        {/* History Controls */}
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            title={t('annotation.tools.undo')}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
            title={t('annotation.tools.redo')}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-8 hidden sm:block" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant={activeTool === "pan" ? "default" : "outline"}
            size="sm"
            onClick={() => onToolClick("pan")}
            disabled={zoomLevel <= 1}
            title={t('annotation.tools.pan')}
          >
            <Hand className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onZoomOut}
            disabled={zoomLevel <= 0.5}
            title={t('annotation.tools.zoomOut')}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-[10px] sm:text-xs font-medium min-w-[32px] sm:min-w-[40px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onZoomIn}
            disabled={zoomLevel >= 4}
            title={t('annotation.tools.zoomIn')}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          {zoomLevel !== 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetZoom}
              title={t('annotation.tools.resetZoom')}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Separator orientation="vertical" className="h-8 hidden sm:block" />

        {/* Clear */}
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          title={t('annotation.tools.clearAll')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
