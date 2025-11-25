"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "../../ui/alert-dialog";

interface CloseWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function CloseWorkflowDialog({
  open,
  onOpenChange,
  onConfirm
}: CloseWorkflowDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close Project Workflow?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved work in progress. Are you sure you want to close?
            Your progress will be saved, but you&apos;ll need to start the
            workflow again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continue Working</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Yes, Close</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
