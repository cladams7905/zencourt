import * as React from "react";
import { toast } from "sonner";
import { updateListingImageAssignmentsForCurrentUser } from "@web/src/server/actions/listings/image";
import type { ImageMetadata } from "@shared/types/models";

type UseCategorizeMutationsParams = {
  listingId: string;
};

type ImageAssignmentUpdate = {
  id: string;
  category: string | null;
  metadata?: ImageMetadata | null;
};

export function useCategorizeMutations({
  listingId
}: UseCategorizeMutationsParams) {
  const [savingCount, setSavingCount] = React.useState(0);

  const runDraftSave = React.useCallback(async <T>(fn: () => Promise<T>) => {
    setSavingCount((prev) => prev + 1);
    try {
      return await fn();
    } finally {
      setSavingCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  const persistImageAssignments = React.useCallback(
    async (
      updates: ImageAssignmentUpdate[],
      deletions: string[],
      rollback?: () => void
    ) => {
      try {
        await runDraftSave(() =>
          updateListingImageAssignmentsForCurrentUser(
            listingId,
            updates,
            deletions
          )
        );
        return true;
      } catch (error) {
        rollback?.();
        toast.error(
          (error as Error).message || "Failed to update listing images."
        );
        return false;
      }
    },
    [listingId, runDraftSave]
  );

  return {
    savingCount,
    runDraftSave,
    persistImageAssignments
  };
}
