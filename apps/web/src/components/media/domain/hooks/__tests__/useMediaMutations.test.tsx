import { act, renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { useMediaMutations } from "@web/src/components/media/domain/hooks/useMediaMutations";
import type { DBUserMedia } from "@db/types/models";

jest.mock("@web/src/server/actions/media/commands", () => ({
  createUserMediaRecordsForCurrentUser: jest.fn(),
  deleteUserMediaForCurrentUser: jest.fn()
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

const { createUserMediaRecordsForCurrentUser, deleteUserMediaForCurrentUser } = jest.requireMock(
  "@web/src/server/actions/media/commands"
);

const initialMedia: DBUserMedia[] = [
  {
    id: "m1",
    userId: "u1",
    type: "image",
    url: "https://x/image.jpg",
    thumbnailUrl: null,
    usageCount: 0,
    uploadedAt: new Date("2025-01-01T00:00:00.000Z")
  }
];

describe("useMediaMutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes and syncs media items from props", () => {
    const { result, rerender } = renderHook(
      (items: DBUserMedia[]) =>
        useMediaMutations({ initialMedia: items }),
      { initialProps: initialMedia }
    );

    expect(result.current.mediaItems).toHaveLength(1);

    const nextItems = [
      ...initialMedia,
      {
        ...initialMedia[0],
        id: "m2",
        type: "video" as const,
        url: "https://x/video.mp4"
      }
    ];

    rerender(nextItems);
    expect(result.current.mediaItems).toHaveLength(2);
  });

  it("creates records and prepends created media", async () => {
    createUserMediaRecordsForCurrentUser.mockResolvedValue([
      {
        ...initialMedia[0],
        id: "m-new"
      }
    ]);

    const { result } = renderHook(() =>
      useMediaMutations({ initialMedia })
    );

    await act(async () => {
      await result.current.handleCreateRecords([
        { key: "k1", type: "image", thumbnailKey: undefined }
      ]);
    });

    expect(result.current.mediaItems[0]?.id).toBe("m-new");
  });

  it("opens and clears delete dialog state", () => {
    const { result } = renderHook(() =>
      useMediaMutations({ initialMedia })
    );

    act(() => {
      result.current.handleRequestDelete(initialMedia[0]);
    });

    expect(result.current.isDeleteOpen).toBe(true);
    expect(result.current.mediaToDelete?.id).toBe("m1");

    act(() => {
      result.current.handleDeleteDialogChange(false);
    });

    expect(result.current.isDeleteOpen).toBe(false);
    expect(result.current.mediaToDelete).toBeNull();
  });

  it("deletes media successfully", async () => {
    deleteUserMediaForCurrentUser.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useMediaMutations({ initialMedia })
    );

    act(() => {
      result.current.handleRequestDelete(initialMedia[0]);
    });

    await act(async () => {
      await result.current.handleConfirmDelete();
    });

    await waitFor(() => {
      expect(deleteUserMediaForCurrentUser).toHaveBeenCalledWith("m1");
      expect(result.current.mediaItems).toHaveLength(0);
      expect(toast.success).toHaveBeenCalledWith("Media deleted.");
    });
  });

  it("shows error toast when delete fails", async () => {
    deleteUserMediaForCurrentUser.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() =>
      useMediaMutations({ initialMedia })
    );

    act(() => {
      result.current.handleRequestDelete(initialMedia[0]);
    });

    await act(async () => {
      await result.current.handleConfirmDelete();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("boom");
      expect(result.current.mediaItems).toHaveLength(1);
    });
  });

  it("no-ops delete when nothing is selected", async () => {
    const { result } = renderHook(() =>
      useMediaMutations({ initialMedia })
    );

    await act(async () => {
      await result.current.handleConfirmDelete();
    });

    expect(deleteUserMediaForCurrentUser).not.toHaveBeenCalled();
  });
});
