import * as React from "react";
import { toast } from "sonner";
import type { DBUserMedia, UserMediaType } from "@db/types/models";
import {
  createUserMediaRecordsForCurrentUser,
  deleteUserMediaForCurrentUser
} from "@web/src/server/actions/media/commands";

interface UseMediaMutationsArgs {
  userId: string;
  initialMedia: DBUserMedia[];
}

export const useMediaMutations = ({
  initialMedia
}: UseMediaMutationsArgs) => {
  const [mediaItems, setMediaItems] = React.useState<DBUserMedia[]>(initialMedia);
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [mediaToDelete, setMediaToDelete] = React.useState<DBUserMedia | null>(
    null
  );
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    setMediaItems(initialMedia);
  }, [initialMedia]);

  const handleCreateRecords = React.useCallback(
    async (
      records: Array<{ key: string; type: UserMediaType; thumbnailKey?: string }>
    ) => {
      const created = await createUserMediaRecordsForCurrentUser(records);
      setMediaItems((prev) => [...created, ...prev]);
    },
    []
  );

  const handleRequestDelete = React.useCallback((item: DBUserMedia) => {
    setMediaToDelete(item);
    setIsDeleteOpen(true);
  }, []);

  const handleDeleteDialogChange = React.useCallback((open: boolean) => {
    setIsDeleteOpen(open);
    if (!open) {
      setMediaToDelete(null);
    }
  }, []);

  const handleConfirmDelete = React.useCallback(async () => {
    if (!mediaToDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteUserMediaForCurrentUser(mediaToDelete.id);
      setMediaItems((prev) => prev.filter((item) => item.id !== mediaToDelete.id));
      toast.success("Media deleted.");
      setIsDeleteOpen(false);
      setMediaToDelete(null);
    } catch (error) {
      toast.error(
        (error as Error).message || "Failed to delete media. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, mediaToDelete]);

  return {
    mediaItems,
    isUploadOpen,
    setIsUploadOpen,
    handleCreateRecords,
    isDeleteOpen,
    mediaToDelete,
    isDeleting,
    handleRequestDelete,
    handleDeleteDialogChange,
    handleConfirmDelete
  };
};
