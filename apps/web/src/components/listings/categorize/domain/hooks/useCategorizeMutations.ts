import * as React from "react";
import { toast } from "sonner";
import type { ListingImageItem } from "@web/src/components/listings/categorize/shared";
import {
  assignPrimaryListingImageForCategoryForCurrentUser,
  updateListingImageAssignmentsForCurrentUser
} from "@web/src/server/actions/listings/commands";

type UseCategorizeMutationsParams = {
  userId: string;
  listingId: string;
  setImages: React.Dispatch<React.SetStateAction<ListingImageItem[]>>;
};

type ImageAssignmentUpdate = {
  id: string;
  category: string | null;
  isPrimary?: boolean;
};

export function useCategorizeMutations({
  listingId,
  setImages
}: UseCategorizeMutationsParams) {
  const [savingCount, setSavingCount] = React.useState(0);

  const runDraftSave = React.useCallback(async <T,>(fn: () => Promise<T>) => {
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

  const ensurePrimaryForCategory = React.useCallback(
    async (category: string | null, candidateImages: ListingImageItem[]) => {
      if (!category) {
        return;
      }
      const categoryImages = candidateImages.filter(
        (image) => image.category === category
      );
      if (categoryImages.length === 0) {
        return;
      }
      const hasPrimary = categoryImages.some((image) => image.isPrimary);
      if (hasPrimary) {
        return;
      }
      try {
        const { primaryImageId } = await runDraftSave(() =>
          assignPrimaryListingImageForCategoryForCurrentUser(listingId, category)
        );
        if (primaryImageId) {
          setImages((prev) =>
            prev.map((image) =>
              image.category === category
                ? { ...image, isPrimary: image.id === primaryImageId }
                : image
            )
          );
        }
      } catch (error) {
        toast.error(
          (error as Error).message || "Failed to update primary image."
        );
      }
    },
    [listingId, runDraftSave, setImages]
  );

  return {
    savingCount,
    runDraftSave,
    persistImageAssignments,
    ensurePrimaryForCategory
  };
}
