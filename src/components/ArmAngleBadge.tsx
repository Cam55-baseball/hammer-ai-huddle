import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ArmAngleAssessment {
  angle_degrees?: number | null;
  safety_status: "safer" | "risk" | "unknown";
  confidence?: "high" | "medium" | "low";
  notes?: string;
}

interface ArmAngleBadgeProps {
  assessment: ArmAngleAssessment;
  className?: string;
}

export const ArmAngleBadge = ({ assessment, className = "" }: ArmAngleBadgeProps) => {
  const { angle_degrees, safety_status, confidence, notes } = assessment;

  const getBadgeConfig = () => {
    switch (safety_status) {
      case "safer":
        return {
          icon: ShieldCheck,
          label: angle_degrees ? `Safer Angle: ${Math.round(angle_degrees)}°` : "Safer Angle",
          variant: "default" as const,
          bgColor: "bg-green-500/10 hover:bg-green-500/20",
          textColor: "text-green-700 dark:text-green-400",
          borderColor: "border-green-500/20",
          tooltip: "Hand-elbow-shoulder angle is less than 90°, indicating reduced injury risk and proper shoulder rotation timing."
        };
      case "risk":
        return {
          icon: AlertTriangle,
          label: angle_degrees ? `Health Risk: ${Math.round(angle_degrees)}°` : "Health Risk Angle",
          variant: "destructive" as const,
          bgColor: "bg-destructive/10 hover:bg-destructive/20",
          textColor: "text-destructive",
          borderColor: "border-destructive/20",
          tooltip: "Hand-elbow-shoulder angle is 90° or greater, indicating increased injury risk. This often means shoulder rotation is late or insufficient."
        };
      case "unknown":
      default:
        return {
          icon: HelpCircle,
          label: "Angle Not Determined",
          variant: "outline" as const,
          bgColor: "bg-muted/50",
          textColor: "text-muted-foreground",
          borderColor: "border-border",
          tooltip: "Arm angle could not be determined from this video angle or quality."
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const tooltipContent = (
    <div className="space-y-2 max-w-xs">
      <p className="font-semibold text-sm">Arm Angle Safety Check</p>
      <p className="text-xs">{config.tooltip}</p>
      {angle_degrees && (
        <p className="text-xs">
          <span className="font-medium">Measured:</span> {Math.round(angle_degrees)}°
        </p>
      )}
      {confidence && (
        <p className="text-xs">
          <span className="font-medium">Confidence:</span> {confidence}
        </p>
      )}
      {notes && (
        <p className="text-xs italic mt-2 pt-2 border-t border-border">
          {notes}
        </p>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={config.variant}
            className={`${config.bgColor} ${config.textColor} ${config.borderColor} border cursor-help ${className}`}
          >
            <Icon className="h-3.5 w-3.5 mr-1.5" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
