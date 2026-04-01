import { renderHook } from "@testing-library/react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  getOptimisticClipRegeneration,
  resetListingClipRegenerationStoreForTests,
  setOptimisticClipRegeneration
} from "../regenerationState";
import { useListingClipManagerWorkspaceSync } from "../sync";

jest.mock("swr", () => jest.fn());

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock("@web/src/lib/core/http/client", () => ({
  fetchApiData: jest.fn()
}));

const mockUseSWR = jest.mocked(useSWR);
const mockToastSuccess = jest.mocked(toast.success);
const mockToastError = jest.mocked(toast.error);

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
  const items = [buildClipItem()];

  return {
    listingId: "listing-1",
    items,
    clipItems: items,
    selectedClipId: "clip-1",
    selectedVersionId: "version-1",
    draftAiDirections: "Draft directions",
    timedOutClipIds: new Set<string>(),
    canceledClipIds: new Set<string>(),
    pendingBatchIdByClipId: {},
    previousStatusesRef: { current: new Map<string, string>() },
    previousDraftSelectionRef: {
      current: null as { clipId: string | null; versionId: string | null } | null
    },
    lastSignatureRef: { current: "" },
    setClipItems: jest.fn(),
    setSelectedClipId: jest.fn(),
    setSelectedVersionId: jest.fn(),
    setDraftAiDirections: jest.fn(),
    setTimedOutClipIds: jest.fn(),
    setCanceledClipIds: jest.fn(),
    setPendingBatchIdByClipId: jest.fn(),
    ...overrides
  };
}

describe("useListingClipManagerWorkspaceSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetListingClipRegenerationStoreForTests();
    mockUseSWR.mockReturnValue({ data: undefined } as never);
  });

  it("clears optimistic state and pending batches when polling completes a regeneration", () => {
    const completedVersion = buildClipVersion({
      clipVersionId: "version-2",
      versionNumber: 2
    });
    const fallbackItem = buildClipItem();
    setOptimisticClipRegeneration("listing-1", "clip-1", {
      fallbackItem,
      inFlightVersion: buildClipVersion({
        clipVersionId: "version-2",
        versionNumber: 2,
        versionStatus: "processing"
      }),
      batchId: "batch-1"
    });
    const params = createParams({
      clipItems: [
        buildClipItem({
          currentVersion: fallbackItem.currentVersion,
          inFlightVersion: buildClipVersion({
            clipVersionId: "version-2",
            versionNumber: 2,
            versionStatus: "processing"
          }),
          versions: [completedVersion, fallbackItem.currentVersion]
        })
      ],
      selectedVersionId: null,
      pendingBatchIdByClipId: { "clip-1": "batch-1" },
      previousStatusesRef: { current: new Map([["clip-1", "processing"]]) }
    });
    mockUseSWR.mockReturnValue({
      data: {
        clipVersionItems: [
          buildClipItem({
            currentVersion: completedVersion,
            versions: [completedVersion, fallbackItem.currentVersion]
          })
        ]
      }
    } as never);

    renderHook(() => useListingClipManagerWorkspaceSync(params as never));

    expect(mockToastSuccess).toHaveBeenCalledWith("Kitchen clip regenerated.");
    expect(params.setSelectedClipId).toHaveBeenCalledWith("clip-1");
    expect(params.setSelectedVersionId).toHaveBeenCalledWith("version-2");
    expect(getOptimisticClipRegeneration("listing-1", "clip-1")).toBeNull();

    const updatePending = params.setPendingBatchIdByClipId.mock.calls[0]?.[0] as (
      state: Record<string, string>
    ) => Record<string, string>;
    expect(updatePending({ "clip-1": "batch-1", other: "keep" })).toEqual({
      other: "keep"
    });
  });

  it("surfaces failed terminal polling states and clears pending batches", () => {
    setOptimisticClipRegeneration("listing-1", "clip-1", {
      fallbackItem: buildClipItem(),
      inFlightVersion: buildClipVersion({
        clipVersionId: "version-2",
        versionNumber: 2,
        versionStatus: "processing"
      }),
      batchId: "batch-1"
    });
    const failedVersion = buildClipVersion({
      clipVersionId: "version-2",
      versionNumber: 2,
      versionStatus: "failed",
      videoUrl: null,
      thumbnail: null
    });
    const params = createParams({
      previousStatusesRef: { current: new Map([["clip-1", "pending"]]) },
      pendingBatchIdByClipId: { "clip-1": "batch-1" }
    });
    mockUseSWR.mockReturnValue({
      data: {
        clipVersionItems: [
          buildClipItem({
            currentVersion: failedVersion,
            versions: [failedVersion]
          })
        ]
      }
    } as never);

    renderHook(() => useListingClipManagerWorkspaceSync(params as never));

    expect(mockToastError).toHaveBeenCalledWith(
      "Failed to regenerate Kitchen clip."
    );
    expect(getOptimisticClipRegeneration("listing-1", "clip-1")).toBeNull();
    expect(params.setSelectedClipId).not.toHaveBeenCalled();

    const updatePending = params.setPendingBatchIdByClipId.mock.calls[0]?.[0] as (
      state: Record<string, string>
    ) => Record<string, string>;
    expect(updatePending({ "clip-1": "batch-1" })).toEqual({});
  });

  it("marks overdue regenerations as timed out", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-04-01T12:10:00.000Z"));
    const params = createParams({
      clipItems: [
        buildClipItem({
          currentVersion: buildClipVersion({
            versionStatus: "processing",
            generatedAt: "2026-04-01T12:00:00.000Z"
          })
        })
      ]
    });

    renderHook(() => useListingClipManagerWorkspaceSync(params as never));

    expect(mockToastError).toHaveBeenCalledWith(
      "Generation is taking longer than usual because the queue is busy. We'll keep trying."
    );
    expect(params.setTimedOutClipIds).toHaveBeenCalledWith(new Set(["clip-1"]));

    jest.useRealTimers();
  });

  it("clears local cancel state once polling reports a terminal status", () => {
    const fallbackItem = buildClipItem();
    setOptimisticClipRegeneration("listing-1", "clip-1", {
      fallbackItem,
      inFlightVersion: buildClipVersion({
        clipVersionId: "version-2",
        versionNumber: 2,
        versionStatus: "processing"
      }),
      canceled: true
    });
    const params = createParams({
      clipItems: [fallbackItem],
      canceledClipIds: new Set(["clip-1"]),
      pendingBatchIdByClipId: {},
      timedOutClipIds: new Set(["clip-1"])
    });
    mockUseSWR.mockReturnValue({
      data: {
        clipVersionItems: [
          buildClipItem({
            currentVersion: buildClipVersion({
              clipVersionId: "version-2",
              versionNumber: 2,
              versionStatus: "failed"
            }),
            versions: [
              buildClipVersion({
                clipVersionId: "version-2",
                versionNumber: 2,
                versionStatus: "failed"
              }),
              fallbackItem.currentVersion
            ]
          })
        ]
      }
    } as never);

    renderHook(() => useListingClipManagerWorkspaceSync(params as never));

    expect(params.setTimedOutClipIds).toHaveBeenCalledWith(new Set());
    expect(params.setCanceledClipIds).toHaveBeenCalledWith(new Set());
    expect(getOptimisticClipRegeneration("listing-1", "clip-1")).toBeNull();
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("resets selection and draft state when no clips remain", () => {
    const params = createParams({
      clipItems: [],
      selectedClipId: "clip-1",
      selectedVersionId: "version-1",
      draftAiDirections: "Draft directions"
    });

    renderHook(() => useListingClipManagerWorkspaceSync(params as never));

    expect(params.setSelectedClipId).toHaveBeenCalledWith(null);
    expect(params.setSelectedVersionId).toHaveBeenCalledWith(null);
    expect(params.setDraftAiDirections).toHaveBeenCalledWith("");
  });
});
