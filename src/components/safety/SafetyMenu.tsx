/**
 * Small, unobtrusive overflow menu carrying the Report and Block actions.
 * Drop this anywhere one user can see another user's content or profile.
 */
import { useState } from "react";
import { MoreVertical, Flag, Ban } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportContentDialog, type ReportTarget } from "./ReportContentDialog";
import { BlockUserDialog } from "./BlockUserDialog";

interface Props extends ReportTarget {
  /** Name shown in the block dialog. */
  displayName?: string;
  /** Hide the block action where blocking makes no sense (e.g. own content). */
  allowBlock?: boolean;
  onBlocked?: () => void;
  className?: string;
}

export function SafetyMenu({
  reportedUserId,
  contentType,
  contentId,
  label,
  displayName,
  allowBlock = true,
  onBlocked,
  className,
}: Props) {
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  // Nothing to report or block on your own content.
  if (!user?.id || (reportedUserId && reportedUserId === user.id)) return null;

  const canBlock = allowBlock && Boolean(reportedUserId);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={className ?? "h-8 w-8 text-muted-foreground"}
            aria-label="More options"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => setReportOpen(true)}>
            <Flag className="mr-2 h-4 w-4" />
            Report
          </DropdownMenuItem>
          {canBlock && (
            <DropdownMenuItem onSelect={() => setBlockOpen(true)}>
              <Ban className="mr-2 h-4 w-4" />
              Block this user
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportContentDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        target={{ reportedUserId, contentType, contentId, label }}
      />
      {canBlock && reportedUserId && (
        <BlockUserDialog
          open={blockOpen}
          onOpenChange={setBlockOpen}
          blockedUserId={reportedUserId}
          displayName={displayName}
          onBlocked={onBlocked}
        />
      )}
    </>
  );
}
