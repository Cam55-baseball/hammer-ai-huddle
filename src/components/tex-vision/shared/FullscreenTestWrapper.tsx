import React from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { X, AlertTriangle } from 'lucide-react';

interface FullscreenTestWrapperProps {
  children: React.ReactNode;
  showCancel?: boolean;
  showCancelConfirmation: boolean;
  onCancelClick: () => void;
  onConfirmCancel: () => void;
  onCancelConfirmationChange: (open: boolean) => void;
}

export const FullscreenTestWrapper = ({
  children,
  showCancel = true,
  showCancelConfirmation,
  onCancelClick,
  onConfirmCancel,
  onCancelConfirmationChange,
}: FullscreenTestWrapperProps) => (
  <div className="fixed inset-0 z-50 bg-black flex flex-col p-4 overflow-auto">
    {showCancel && (
      <div className="flex justify-end mb-4">
        <Button variant="destructive" size="sm" onClick={onCancelClick} className="flex items-center gap-2">
          <X className="h-4 w-4" />
          CANCEL ASSESSMENT
        </Button>
      </div>
    )}
    <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-lg">{children}</div>
    </div>
    <AlertDialog open={showCancelConfirmation} onOpenChange={onCancelConfirmationChange}>
      <AlertDialogContent className="border-destructive/50">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancel Assessment?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Are you sure you want to cancel? <strong>All progress will be lost.</strong></p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continue Assessment</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Yes, Cancel
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
);
