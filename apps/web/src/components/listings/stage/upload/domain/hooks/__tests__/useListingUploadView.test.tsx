import { act, renderHook } from "@testing-library/react";
import { URL as NodeURL } from "node:url";
import { useListingUploadView } from "@web/src/components/listings/stage/upload/domain/hooks/useListingUploadView";
import { IMAGE_UPLOAD_LIMIT } from "@shared/utils/mediaUpload";

const mockRouterReplace = jest.fn();
const mockRouterPush = jest.fn();
const mockUpdateListing = jest.fn();
const mockGetStoredBatch = jest.fn();
const mockUseCategorizeProcessingFlow = jest.fn();
const mockUseUploadFlow = jest.fn();
const mockUseUploadDialogState = jest.fn();
const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
    push: mockRouterPush
  })
}));

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args)
  }
}));

jest.mock("@web/src/server/actions/listings/commands", () => ({
  updateListingForCurrentUser: (...args: unknown[]) =>
    mockUpdateListing(...args)
}));

jest.mock(
  "@web/src/components/listings/stage/processing/domain/hooks",
  () => ({
    getStoredCategorizeProcessingBatch: (...args: unknown[]) =>
      mockGetStoredBatch(...args),
    useCategorizeProcessingFlow: (...args: unknown[]) =>
      mockUseCategorizeProcessingFlow(...args)
  })
);

jest.mock("@web/src/components/listings/stage/upload/domain/hooks/useUploadFlow", () => ({
  useUploadFlow: (...args: unknown[]) => mockUseUploadFlow(...args)
}));

jest.mock("@web/src/components/uploads/domain/hooks", () => ({
  useUploadDialogState: (...args: unknown[]) => mockUseUploadDialogState(...args)
}));

jest.mock("@web/src/components/listings/stage/upload/domain/utils", () => ({
  ...jest.requireActual("@web/src/components/listings/stage/upload/domain/utils"),
  validateListingUploadRequirements: jest.fn()
}));

import { validateListingUploadRequirements } from "@web/src/components/listings/stage/upload/domain/utils";

const mockValidate = validateListingUploadRequirements as jest.MockedFunction<
  typeof validateListingUploadRequirements
>;

describe("useListingUploadView", () => {
  /** Simulates useUploadFlow’s returned callback: when “upload” finishes, forwards a batch to the hook’s ref via parentOnComplete. */
  let flowWrappedOnUploadsComplete: (() => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    flowWrappedOnUploadsComplete = null;
    mockGetStoredBatch.mockReturnValue(null);
    mockUseCategorizeProcessingFlow.mockReturnValue({
      batchTotal: 0,
      batchCompleted: 0,
      processingCount: 0,
      isComplete: false,
      batchImages: [],
      progress: 0
    });
    mockUseUploadFlow.mockImplementation(
      ({ listingId: lid, onUploadsComplete: parentOnComplete }) => {
        const onUploadsComplete = () => {
          const id = lid?.trim();
          if (!id) {
            return;
          }
          parentOnComplete?.({
            listingId: id,
            batchImageIds: ["img-1"],
            batchStartedAt: 1000
          });
        };
        flowWrappedOnUploadsComplete = onUploadsComplete;
        return {
          getUploadUrls: jest.fn(),
          buildRecordInput: jest.fn(),
          onCreateRecords: jest.fn(),
          onUploadsComplete
        };
      }
    );
    mockValidate.mockResolvedValue({ accepted: true });
  });

  function setupDialogState(overrides: Partial<ReturnType<typeof baseDialogState>> = {}) {
    const base = baseDialogState();
    const { handleUpload: overrideHandleUpload, ...restOverrides } = overrides;
    const handleUpload =
      overrideHandleUpload ??
      jest.fn().mockImplementation(async () => {
        flowWrappedOnUploadsComplete?.();
      });
    const state = { ...base, ...restOverrides, handleUpload };
    mockUseUploadDialogState.mockImplementation(() => state);
    return state;
  }

  function baseDialogState() {
    return {
      pendingFiles: [] as Array<{ id: string; file: File; previewUrl: string }>,
      isDragging: false,
      setIsDragging: jest.fn(),
      setIsDrivePickerActive: jest.fn(),
      isCompressing: false,
      isDriveLoading: false,
      setIsDriveLoading: jest.fn(),
      driveLoadingCount: 0,
      setDriveLoadingCount: jest.fn(),
      addFiles: jest.fn().mockResolvedValue(undefined),
      handleUpload: jest.fn().mockResolvedValue(undefined),
      removePendingFile: jest.fn()
    };
  }

  it("starts in editing phase when no stored processing batch", () => {
    setupDialogState();
    const { result } = renderHook(() =>
      useListingUploadView({ listingId: "l1", initialImages: [] })
    );
    expect(result.current.phase).toBe("editing");
  });

  it("provides upload-dialog callbacks for open change and file validation", async () => {
    setupDialogState();
    renderHook(() => useListingUploadView({ listingId: "l1", initialImages: [] }));

    const dialogParams = mockUseUploadDialogState.mock.calls[0]?.[0];

    dialogParams.onOpenChange(false);

    expect(
      dialogParams.fileValidator(new File(["a"], "a.jpg", { type: "image/jpeg" }))
    ).toEqual({ accepted: true });
    expect(
      dialogParams.fileValidator(new File(["a"], "a.txt", { type: "text/plain" }))
    ).toEqual({
      accepted: false,
      error: "Only image files are supported."
    });
  });

  it("restores analyzing phase when a stored batch exists for the listing", () => {
    mockGetStoredBatch.mockReturnValue({
      batchImageIds: ["a", "b"],
      batchStartedAt: 99
    });
    setupDialogState();
    const { result } = renderHook(() =>
      useListingUploadView({ listingId: "l1", initialImages: [] })
    );
    expect(result.current.phase).toBe("analyzing");
    expect(mockUseCategorizeProcessingFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        batchImageIds: ["a", "b"],
        batchStartedAt: 99
      })
    );
  });

  it("clears processing batch state when inline processing navigates away", () => {
    mockGetStoredBatch.mockReturnValue({
      batchImageIds: ["a", "b"],
      batchStartedAt: 99
    });
    setupDialogState();
    const { result } = renderHook(() =>
      useListingUploadView({ listingId: "l1", initialImages: [] })
    );

    const processingArgs = mockUseCategorizeProcessingFlow.mock.calls[0]?.[0];

    act(() => {
      processingArgs.navigate("/listings/l1/stage/categorize");
    });

    expect(mockRouterReplace).toHaveBeenCalledWith(
      "/listings/l1/stage/categorize"
    );
    expect(result.current.phase).toBe("analyzing");
  });

  it("continues to categorize with only initial images when there are no pending files", async () => {
    setupDialogState({ pendingFiles: [] });
    mockUpdateListing.mockResolvedValue({ listingStage: "categorize" });

    const { result } = renderHook(() =>
      useListingUploadView({
        listingId: "listing-99",
        initialImages: [{ id: "i1", url: "https://x/a.jpg", filename: "a.jpg" }]
      })
    );

    await act(async () => {
      await result.current.handleContinue();
    });

    expect(mockUpdateListing).toHaveBeenCalledWith("listing-99", {
      listingStage: "categorize"
    });
    expect(mockRouterPush).toHaveBeenCalledWith(
      "/listings/listing-99/stage/categorize"
    );
  });

  it("shows toast when a file duplicates a pending pick", async () => {
    const file = new File(["x"], "dup.jpg", { type: "image/jpeg" });
    const pendingFiles = [
      {
        id: "p1",
        file,
        previewUrl: "blob:1"
      }
    ];
    setupDialogState({ pendingFiles });

    const { result } = renderHook(() =>
      useListingUploadView({ listingId: "l1", initialImages: [] })
    );

    await act(async () => {
      await result.current.handleCandidateFiles([file]);
    });

    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining("duplicate")
    );
  });

  it("handles file input changes and clears the element value", async () => {
    const addFiles = jest.fn().mockResolvedValue(undefined);
    setupDialogState({ addFiles });
    const file = new File(["x"], "fresh.jpg", { type: "image/jpeg" });

    const { result } = renderHook(() =>
      useListingUploadView({ listingId: "l1", initialImages: [] })
    );

    const event = {
      target: {
        files: [file],
        value: "filled"
      }
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      result.current.handleFileInputChange(event);
      await Promise.resolve();
    });

    expect(addFiles).toHaveBeenCalledWith([file]);
    expect(event.target.value).toBe("");
  });

  it("shows toast when filename matches an already-uploaded image", async () => {
    const file = new File(["x"], "Existing.JPG", { type: "image/jpeg" });
    setupDialogState();

    const { result } = renderHook(() =>
      useListingUploadView({
        listingId: "l1",
        initialImages: [
          { id: "i1", url: "https://x/u.jpg", filename: "existing.jpg" }
        ]
      })
    );

    await act(async () => {
      await result.current.handleCandidateFiles([file]);
    });

    expect(mockToastError).toHaveBeenCalledWith(
      expect.stringContaining("already uploaded")
    );
  });

  it("shows toast when validation rejects a file", async () => {
    mockValidate.mockResolvedValueOnce({
      accepted: false,
      error: "Too large"
    });
    setupDialogState();
    const file = new File(["x"], "big.jpg", { type: "image/jpeg" });

    const { result } = renderHook(() =>
      useListingUploadView({ listingId: "l1", initialImages: [] })
    );

    await act(async () => {
      await result.current.handleCandidateFiles([file]);
    });

    expect(mockToastError).toHaveBeenCalledWith("Too large");
  });

  it("rejects files once the upload limit is reached", async () => {
    const existing = Array.from({ length: IMAGE_UPLOAD_LIMIT }, (_, index) => ({
      id: `i${index}`,
      url: `https://x/${index}.jpg`,
      filename: `${index}.jpg`
    }));
    setupDialogState();
    const file = new File(["x"], "overflow.jpg", { type: "image/jpeg" });

    const { result } = renderHook(() =>
      useListingUploadView({ listingId: "l1", initialImages: existing })
    );

    await act(async () => {
      await result.current.handleCandidateFiles([file]);
    });

    expect(mockToastError).toHaveBeenCalledWith(
      `"overflow.jpg" was rejected: no more than ${IMAGE_UPLOAD_LIMIT} images are allowed.`
    );
  });

  it("runs upload flow and moves to analyzing when batch metadata is present", async () => {
    const addFiles = jest.fn().mockResolvedValue(undefined);
    const handleUpload = jest.fn().mockImplementation(async () => {
      flowWrappedOnUploadsComplete?.();
    });
    setupDialogState({
      pendingFiles: [
        {
          id: "p1",
          file: new File(["a"], "a.jpg", { type: "image/jpeg" }),
          previewUrl: "blob:a"
        }
      ],
      addFiles,
      handleUpload
    });
    mockUpdateListing.mockResolvedValue({ listingStage: "categorize" });

    const { result } = renderHook(() =>
      useListingUploadView({
        listingId: "listing-2",
        initialImages: []
      })
    );

    await act(async () => {
      await result.current.handleContinue();
    });

    expect(handleUpload).toHaveBeenCalled();
    expect(mockUpdateListing).toHaveBeenCalledWith("listing-2", {
      listingStage: "categorize"
    });
    expect(result.current.phase).toBe("analyzing");
  });

  it("resets to editing when upload completes without batch metadata", async () => {
    const handleUpload = jest.fn().mockResolvedValue(undefined);
    setupDialogState({
      pendingFiles: [
        {
          id: "p1",
          file: new File(["a"], "a.jpg", { type: "image/jpeg" }),
          previewUrl: "blob:a"
        }
      ],
      handleUpload
    });

    const { result } = renderHook(() =>
      useListingUploadView({ listingId: "l1", initialImages: [] })
    );

    await act(async () => {
      await result.current.handleContinue();
    });

    expect(result.current.phase).toBe("editing");
    expect(result.current.processingLocalPreviews).toEqual([]);
  });

  it("resets to editing and toasts when saving categorize stage fails after upload", async () => {
    const handleUpload = jest.fn().mockImplementation(async () => {
      flowWrappedOnUploadsComplete?.();
    });
    setupDialogState({
      pendingFiles: [
        {
          id: "p1",
          file: new File(["a"], "a.jpg", { type: "image/jpeg" }),
          previewUrl: "blob:a"
        }
      ],
      handleUpload
    });
    mockUpdateListing.mockRejectedValueOnce(new Error("save failed"));

    const { result } = renderHook(() =>
      useListingUploadView({ listingId: "listing-2", initialImages: [] })
    );

    await act(async () => {
      await result.current.handleContinue();
    });

    expect(result.current.phase).toBe("editing");
    expect(result.current.processingLocalPreviews).toEqual([]);
    expect(mockToastError).toHaveBeenCalledWith("save failed");
  });

  it("resets to editing and toasts when upload fails", async () => {
    const handleUpload = jest.fn().mockRejectedValue(new Error("upload failed"));
    setupDialogState({
      pendingFiles: [
        {
          id: "p1",
          file: new File(["a"], "a.jpg", { type: "image/jpeg" }),
          previewUrl: "blob:a"
        }
      ],
      handleUpload
    });

    const { result } = renderHook(() =>
      useListingUploadView({ listingId: "listing-2", initialImages: [] })
    );

    await act(async () => {
      await result.current.handleContinue();
    });

    expect(result.current.phase).toBe("editing");
    expect(result.current.processingLocalPreviews).toEqual([]);
    expect(mockToastError).toHaveBeenCalledWith("upload failed");
  });

  it("navigates back to create flow when listing id is missing", () => {
    setupDialogState();
    const { result } = renderHook(() => useListingUploadView({}));

    act(() => {
      result.current.handleBack();
    });

    expect(mockRouterPush).toHaveBeenCalledWith("/listings/create");
  });

  it("navigates back to listing create with id when listing exists", () => {
    setupDialogState();
    const { result } = renderHook(() =>
      useListingUploadView({ listingId: "draft-1", initialImages: [] })
    );

    act(() => {
      result.current.handleBack();
    });

    expect(mockRouterPush).toHaveBeenCalledWith(
      "/listings/create?listingId=draft-1"
    );
  });

  it("blocks back navigation when unsaved files exist and the user cancels", () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
    setupDialogState({
      pendingFiles: [
        {
          id: "p1",
          file: new File(["a"], "a.jpg", { type: "image/jpeg" }),
          previewUrl: "blob:a"
        }
      ]
    });
    const { result } = renderHook(() =>
      useListingUploadView({ listingId: "draft-1", initialImages: [] })
    );

    act(() => {
      result.current.handleBack();
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("prevents same-origin link navigation when unsaved files exist and confirm is declined", () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
    const originalURL = global.URL;
    global.URL = NodeURL as typeof URL;
    setupDialogState({
      pendingFiles: [
        {
          id: "p1",
          file: new File(["a"], "a.jpg", { type: "image/jpeg" }),
          previewUrl: "blob:a"
        }
      ]
    });
    renderHook(() =>
      useListingUploadView({ listingId: "draft-1", initialImages: [] })
    );

    const anchor = document.createElement("a");
    anchor.href = "/next";
    document.body.appendChild(anchor);
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true
    });

    anchor.dispatchEvent(event);

    expect(confirmSpy).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
    anchor.remove();
    global.URL = originalURL;
    confirmSpy.mockRestore();
  });

  it("ignores links marked to bypass the unsaved guard", () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
    setupDialogState({
      pendingFiles: [
        {
          id: "p1",
          file: new File(["a"], "a.jpg", { type: "image/jpeg" }),
          previewUrl: "blob:a"
        }
      ]
    });
    renderHook(() =>
      useListingUploadView({ listingId: "draft-1", initialImages: [] })
    );

    const anchor = document.createElement("a");
    anchor.href = "/next";
    anchor.setAttribute("data-ignore-unsaved", "true");
    document.body.appendChild(anchor);
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true
    });

    anchor.dispatchEvent(event);

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    anchor.remove();
    confirmSpy.mockRestore();
  });
});
