/**
 * PHASE 9 — Conversion Execution Modal
 * - No ranking logic
 * - No DB writes
 * - Only explicit owner-triggered navigation
 * - Phase 10 hook point: replace window.location.href with real router + builder pages
 */
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ConversionAction } from '@/lib/videoConversionActions';

type Props = {
  open: boolean;
  onClose: () => void;
  action: ConversionAction;
  videoId: string;
};

const ACTION_LABEL: Record<Exclude<ConversionAction, null>, string> = {
  open_program_builder: 'Create Training Program',
  open_bundle_builder: 'Build Video Bundle',
  open_consultation_flow: 'Start Consultation Flow',
};

export function VideoConversionModal({ open, onClose, action, videoId }: Props) {
  const navigate = useNavigate();
  if (!action) return null;

  const label = ACTION_LABEL[action];

  const handleProceed = () => {
    console.log('[PHASE_9_ROUTE]', {
      action,
      videoId,
      timestamp: Date.now(),
    });
    // Phase 10 — real SPA navigation into owner builder pages
    navigate(`/owner/${action}?videoId=${encodeURIComponent(videoId)}`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conversion Action</DialogTitle>
          <DialogDescription>
            {label} for the selected video. This is an owner-confirmed action — nothing
            is charged or persisted yet.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleProceed}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
