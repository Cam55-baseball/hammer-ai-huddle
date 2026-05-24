import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEngineVersion } from "@/hooks/useEventLineage";
import { ShieldCheck, ShieldAlert } from "lucide-react";

interface Props {
  engineVersion: string | null;
}

export function EngineVersionBadge({ engineVersion }: Props) {
  const { data, isLoading } = useEngineVersion(engineVersion);

  if (!engineVersion) {
    return (
      <Badge variant="destructive" className="gap-1">
        <ShieldAlert className="h-3 w-3" />
        no engine_version
      </Badge>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 font-mono text-xs">
            <ShieldCheck className="h-3 w-3" />
            engine {engineVersion}
            {data?.schema_version != null && (
              <span className="text-muted-foreground">· schema v{data.schema_version}</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {isLoading ? (
            <span>Loading engine metadata…</span>
          ) : data ? (
            <div className="space-y-1 text-xs">
              <div>
                <span className="font-semibold">engine_version:</span> {data.engine_version}
              </div>
              {data.schema_version != null && (
                <div>
                  <span className="font-semibold">schema_version:</span> {data.schema_version}
                </div>
              )}
              {data.released_at && (
                <div>
                  <span className="font-semibold">released:</span>{" "}
                  {new Date(data.released_at).toLocaleString()}
                </div>
              )}
              {data.deprecated_at && (
                <div className="text-destructive">
                  <span className="font-semibold">deprecated:</span>{" "}
                  {new Date(data.deprecated_at).toLocaleString()}
                </div>
              )}
              {data.notes && <div className="opacity-80">{data.notes}</div>}
            </div>
          ) : (
            <span>Engine version not found in registry.</span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
