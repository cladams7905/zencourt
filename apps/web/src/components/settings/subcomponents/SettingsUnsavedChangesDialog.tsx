"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "../../ui/alert-dialog";
import { Button } from "../../ui/button";

interface SettingsUnsavedChangesDialogProps {
  isDirty: boolean;
  onSave: () => Promise<void>;
}

export function SettingsUnsavedChangesDialog({
  isDirty,
  onSave
}: SettingsUnsavedChangesDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [pendingNavigation, setPendingNavigation] = React.useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleCancelNavigation = () => {
    setIsOpen(false);
    setPendingNavigation(null);
  };

  const handleDiscardNavigation = () => {
    const nextUrl = pendingNavigation;
    setIsOpen(false);
    setPendingNavigation(null);
    if (nextUrl) {
      router.push(nextUrl);
    }
  };

  const handleConfirmSaveNavigation = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
    const nextUrl = pendingNavigation;
    setIsOpen(false);
    setPendingNavigation(null);
    if (nextUrl) {
      router.push(nextUrl);
    }
  };

  React.useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  React.useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      if (event.button !== 0 || event.metaKey || event.ctrlKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) {
        return;
      }
      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("data-ignore-unsaved") === "true"
      ) {
        return;
      }
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }
      const nextUrl = new URL(href, window.location.href);
      const currentUrl = new URL(window.location.href);
      const isHttpNavigation =
        nextUrl.protocol === "http:" || nextUrl.protocol === "https:";
      if (!isHttpNavigation) {
        return;
      }
      if (nextUrl.origin !== currentUrl.origin) {
        return;
      }
      if (nextUrl.href === currentUrl.href) {
        return;
      }
      event.preventDefault();
      setPendingNavigation(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      setIsOpen(true);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isDirty]);

  React.useEffect(() => {
    if (!isDirty && isOpen) {
      setIsOpen(false);
      setPendingNavigation(null);
    }
  }, [isDirty, isOpen]);

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setPendingNavigation(null);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save changes before leaving?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes in your settings. Save them before
            navigating away.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleCancelNavigation}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDiscardNavigation}>
            Discard
          </Button>
          <Button onClick={handleConfirmSaveNavigation} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
