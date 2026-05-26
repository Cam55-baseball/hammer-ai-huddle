import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEngineVersion } from "@/hooks/useEventLineage";
import { ShieldCheck } from "lucide-react";

interface Props {
  engineVersion: string;
}

/**
 * engine_version is NOT NULL at the DB contract level on every source table
 * (asb_events, asb_state_snapshots, asb_event_lineage). No null branch.
 */
export function EngineVersionBadge({ engineVersion }: Props) {
  const { data, isLoading } = useEngineVersion(engineVersion);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 text-xs">
            <ShieldCheck className="h-3 w-3" />
            <span>Recorded by <span className="font-mono">{engineVersion}</span></span>
            {data && (
              <span className="text-muted-foreground">· schema {data.schema_version}</span>
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
              <div>
                <span className="font-semibold">schema_version:</span> {data.schema_version}
              </div>
              <div>
                <span className="font-semibold">released:</span>{" "}
                {new Date(data.released_at).toISOString()}
              </div>
              {data.deprecated_at && (
                <div className="text-destructive">
                  <span className="font-semibold">deprecated:</span>{" "}
                  {new Date(data.deprecated_at).toISOString()}
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
