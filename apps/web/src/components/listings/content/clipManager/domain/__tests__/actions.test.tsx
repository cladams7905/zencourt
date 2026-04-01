import { act, renderHook } from "@testing-library/react";
import { toast } from "sonner";
import {
  cancelVideoGenerationBatch,
  regenerateListingClipVersion,
  selectListingClipVersion
} from "@web/src/server/actions/video/generate";
import { resetListingClipRegenerationStoreForTests } from "../regenerationState";
import { useListingClipManagerWorkspaceActions } from "../actions";

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock("@web/src/server/actions/video/generate", () => ({
  cancelVideoGenerationBatch: jest.fn(),
  regenerateListingClipVersion: jest.fn(),
  selectListingClipVersion: jest.fn()
}));

const mockToastSuccess = jest.mocked(toast.success);
const mockToastError = jest.mocked(toast.error);
const mockCancelVideoGenerationBatch = jest.mocked(cancelVideoGenerationBatch);
const mockRegenerateListingClipVersion = jest.mocked(
  regenerateListingClipVersion
);
const mockSelectListingClipVersion = jest.mocked(selectListingClipVersion);

function buildClipVersion(overrides: Record<string, unknown> = {}) {
  return {
    id: "content-1",
    clipVersionId: "version-1",
    versionNumber: 1,
    versionStatus: "completed",
    prompt: "Original prompt",
    generatedAt: "2026-04-01T00:00:00.000Z",
    thumbnail: "https://img/thumb.jpg",
    videoUrl: "https://video/clip.mp4",
    ...overrides
  };
}

function buildClipItem(overrides: Record<string, unknown> = {}) {
  const currentVersion = buildClipVersion();
  return {
    clipId: "clip-1",
    roomName: "Kitchen",
    clipIndex: 0,
    sortOrder: 0,
    currentVersion,
    inFlightVersion: null,
    versions: [currentVersion],
    ...overrides
  };
}

function createParams(overrides: Record<string, unknown> = {}) {
  const selectedItem = buildClipItem();

  return {
    listingId: "listing-1",
    selectedItem,
    selectedVersion: selectedItem.currentVersion,
    selectedClipBatchId: "batch-1",
    selectedVersionId: selectedItem.currentVersion.clipVersionId,
    draftAiDirections: "Custom directions",
    canceledClipIds: new Set<string>(),
    pendingBatchIdByClipId: {},
    startTransition: (callback: () => void) => callback(),
    startCancelTransition: (callback: () => void) => callback(),
    startSelectVersionTransition: (callback: () => void) => callback(),
    setClipItems: jest.fn(),
    setSelectedClipId: jest.fn(),
    setSelectedVersionId: jest.fn(),
    setDraftAiDirections: jest.fn(),
    setIsRegenerateMenuOpen: jest.fn(),
    setIsCustomizeExpanded: jest.fn(),
    setIsCancelDialogOpen: jest.fn(),
    setTimedOutClipIds: jest.fn(),
    setCanceledClipIds: jest.fn(),
    setPendingBatchIdByClipId: jest.fn(),
    ...overrides
  };
}

describe("useListingClipManagerWorkspaceActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetListingClipRegenerationStoreForTests();
  });

  it("starts regeneration from the selected prompt and updates optimistic local state", async () => {
    mockRegenerateListingClipVersion.mockResolvedValue({
      clipVersionId: "version-2",
      batchId: "batch-2"
    } as never);
    const params = createParams();

    const { result } = renderHook(() =>
      useListingClipManagerWorkspaceActions(params as never)
    );

    await act(async () => {
      result.current.handleQuickRegenerate();
      await Promise.resolve();
    });

    expect(params.setDraftAiDirections).toHaveBeenCalledWith("Original prompt");
    expect(mockRegenerateListingClipVersion).toHaveBeenCalledWith({
      listingId: "listing-1",
      clipId: "clip-1",
      prompt: "Original prompt"
    });
    expect(params.setIsRegenerateMenuOpen).toHaveBeenCalledWith(false);
    expect(params.setIsCustomizeExpanded).toHaveBeenCalledWith(false);
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Started regenerating Kitchen clip."
    );

    const updateClipItems = params.setClipItems.mock.calls[0]?.[0] as (
      items: ReturnType<typeof buildClipItem>[]
    ) => ReturnType<typeof buildClipItem>[];
    const updatedItems = updateClipItems([buildClipItem()]);
    expect(updatedItems[0]?.inFlightVersion).toMatchObject({
      clipVersionId: "version-2",
      prompt: "Original prompt",
      versionStatus: "processing"
    });
  });

  it("surfaces regeneration failures", async () => {
    mockRegenerateListingClipVersion.mockRejectedValue(new Error("No credits"));
    const params = createParams();

    const { result } = renderHook(() =>
      useListingClipManagerWorkspaceActions(params as never)
    );

    await act(async () => {
      result.current.handleSubmitCustomizedRegeneration();
      await Promise.resolve();
    });

    expect(mockToastError).toHaveBeenCalledWith("No credits");
  });

  it("opens customization and closes it when the menu closes or the user goes back", () => {
    const params = createParams();

    const { result } = renderHook(() =>
      useListingClipManagerWorkspaceActions(params as never)
    );

    act(() => {
      result.current.handleOpenCustomize();
      result.current.handleBackToQuickActions();
      result.current.handleRegenerateMenuOpenChange(false);
    });

    expect(params.setDraftAiDirections).toHaveBeenCalledWith("Original prompt");
    expect(params.setIsCustomizeExpanded).toHaveBeenCalledWith(true);
    expect(params.setIsCustomizeExpanded).toHaveBeenCalledWith(false);
    expect(params.setIsRegenerateMenuOpen).toHaveBeenCalledWith(false);
  });

  it("shows an error when no clip is available to download", async () => {
    const params = createParams({ selectedVersion: { clipVersionId: null } });

    const { result } = renderHook(() =>
      useListingClipManagerWorkspaceActions(params as never)
    );

    await act(async () => {
      await result.current.handleDownloadClip();
    });

    expect(mockToastError).toHaveBeenCalledWith("No clip available to download.");
  });

  it("downloads the selected clip when a clip version exists", async () => {
    const link = {
      href: "",
      click: jest.fn(),
      remove: jest.fn()
    };
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = jest
      .spyOn(document, "createElement")
      .mockImplementation(((tagName: string, options?: ElementCreationOptions) =>
        tagName === "a"
          ? (link as never)
          : originalCreateElement(tagName, options)) as typeof document.createElement);
    const appendChildSpy = jest
      .spyOn(document.body, "appendChild")
      .mockImplementation((node) => node);
    const params = createParams();

    const { result } = renderHook(() =>
      useListingClipManagerWorkspaceActions(params as never)
    );

    await act(async () => {
      await result.current.handleDownloadClip();
    });

    expect(link.href).toBe(
      "/api/v1/listings/listing-1/clips/version-1/download"
    );
    expect(link.click).toHaveBeenCalled();
    expect(link.remove).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
  });

  it("cancels generation and restores the fallback clip state", async () => {
    mockCancelVideoGenerationBatch.mockResolvedValue(undefined as never);
    const params = createParams({
      selectedItem: buildClipItem({
        currentVersion: buildClipVersion({
          clipVersionId: "version-2",
          versionStatus: "processing"
        }),
        versions: [
          buildClipVersion({
            clipVersionId: "version-1",
            versionNumber: 1,
            versionStatus: "completed"
          })
        ]
      })
    });

    const { result } = renderHook(() =>
      useListingClipManagerWorkspaceActions(params as never)
    );

    await act(async () => {
      result.current.handleConfirmCancel();
      await Promise.resolve();
    });

    expect(mockCancelVideoGenerationBatch).toHaveBeenCalledWith(
      "batch-1",
      "Canceled by user"
    );
    expect(params.setIsCancelDialogOpen).toHaveBeenCalledWith(false);
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Canceled Kitchen clip generation."
    );

    const updatePending = params.setPendingBatchIdByClipId.mock.calls[0]?.[0] as (
      state: Record<string, string>
    ) => Record<string, string>;
    expect(updatePending({ "clip-1": "batch-1", other: "keep" })).toEqual({
      other: "keep"
    });
  });

  it("rolls back selected version when selecting a clip version fails", async () => {
    mockSelectListingClipVersion.mockRejectedValue(new Error("Failed to select"));
    const params = createParams();

    const { result } = renderHook(() =>
      useListingClipManagerWorkspaceActions(params as never)
    );

    await act(async () => {
      result.current.handleSelectVersion("version-2");
      await Promise.resolve();
    });

    expect(params.setSelectedVersionId).toHaveBeenNthCalledWith(1, "version-2");
    expect(params.setSelectedVersionId).toHaveBeenNthCalledWith(2, "version-1");
    expect(mockToastError).toHaveBeenCalledWith("Failed to select");
  });

  it("updates local currentVersion after selecting a version successfully", async () => {
    mockSelectListingClipVersion.mockResolvedValue(undefined as never);
    const params = createParams({
      selectedItem: buildClipItem({
        versions: [
          buildClipVersion({
            clipVersionId: "version-1",
            versionNumber: 1
          }),
          buildClipVersion({
            clipVersionId: "version-2",
            versionNumber: 2,
            prompt: "New"
          })
        ]
      })
    });

    const { result } = renderHook(() =>
      useListingClipManagerWorkspaceActions(params as never)
    );

    await act(async () => {
      result.current.handleSelectVersion("version-2");
      await Promise.resolve();
    });

    const updateClipItems = params.setClipItems.mock.calls[0]?.[0] as (
      items: ReturnType<typeof buildClipItem>[]
    ) => ReturnType<typeof buildClipItem>[];
    const updated = updateClipItems([
      buildClipItem({
        versions: [
          buildClipVersion({ clipVersionId: "version-1", versionNumber: 1 }),
          buildClipVersion({
            clipVersionId: "version-2",
            versionNumber: 2,
            prompt: "New"
          })
        ]
      })
    ]);

    expect(updated[0]?.currentVersion.clipVersionId).toBe("version-2");
  });

  it("reports per-item regeneration state and ignores locally canceled clips", () => {
    const params = createParams({
      canceledClipIds: new Set(["clip-1"]),
      pendingBatchIdByClipId: {}
    });

    const { result } = renderHook(() =>
      useListingClipManagerWorkspaceActions(params as never)
    );

    expect(
      result.current.isItemRegenerating(
        buildClipItem({
          currentVersion: buildClipVersion({ versionStatus: "processing" })
        }) as never
      )
    ).toBe(false);

    expect(
      result.current.isItemRegenerating(
        buildClipItem({
          clipId: "clip-2",
          currentVersion: buildClipVersion({ versionStatus: "processing" })
        }) as never
      )
    ).toBe(true);
  });
});
