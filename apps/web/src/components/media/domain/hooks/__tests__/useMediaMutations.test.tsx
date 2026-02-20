import { act, renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { useMediaMutations } from "@web/src/components/media/domain/hooks/useMediaMutations";
import type { DBUserMedia } from "@db/types/models";

jest.mock("@web/src/server/actions/db/userMedia", () => ({
  createUserMediaRecords: jest.fn(),
  deleteUserMedia: jest.fn()
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

const { createUserMediaRecords, deleteUserMedia } = jest.requireMock(
  "@web/src/server/actions/db/userMedia"
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
        useMediaMutations({ userId: "u1", initialMedia: items }),
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
    createUserMediaRecords.mockResolvedValue([
      {
        ...initialMedia[0],
        id: "m-new"
      }
    ]);

    const { result } = renderHook(() =>
      useMediaMutations({ userId: "u1", initialMedia })
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
      useMediaMutations({ userId: "u1", initialMedia })
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
    deleteUserMedia.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useMediaMutations({ userId: "u1", initialMedia })
    );

    act(() => {
      result.current.handleRequestDelete(initialMedia[0]);
    });

    await act(async () => {
      await result.current.handleConfirmDelete();
    });

    await waitFor(() => {
      expect(deleteUserMedia).toHaveBeenCalledWith("u1", "m1");
      expect(result.current.mediaItems).toHaveLength(0);
      expect(toast.success).toHaveBeenCalledWith("Media deleted.");
    });
  });

  it("shows error toast when delete fails", async () => {
    deleteUserMedia.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() =>
      useMediaMutations({ userId: "u1", initialMedia })
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
      useMediaMutations({ userId: "u1", initialMedia })
    );

    await act(async () => {
      await result.current.handleConfirmDelete();
    });

    expect(deleteUserMedia).not.toHaveBeenCalled();
  });
});
