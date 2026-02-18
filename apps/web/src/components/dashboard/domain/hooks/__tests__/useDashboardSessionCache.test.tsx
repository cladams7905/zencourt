import { act, renderHook, waitFor } from "@testing-library/react";
import { useDashboardSessionCache } from "@web/src/components/dashboard/domain/hooks/useDashboardSessionCache";
import {
  SESSION_STORAGE_KEY,
  DEFAULT_GENERATED_STATE
} from "@web/src/components/dashboard/shared";

const VALID_SESSION = JSON.stringify({
  expiresAt: Date.now() + 60_000,
  data: {
    ...DEFAULT_GENERATED_STATE,
    videos: {
      ...DEFAULT_GENERATED_STATE.videos,
      market_insights: [{ id: "generated-1", hook: "Saved" }]
    }
  }
});

describe("useDashboardSessionCache", () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  it("hydrates generated content from session", async () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, VALID_SESSION);

    const { result } = renderHook(() => useDashboardSessionCache());

    await waitFor(() => {
      expect(result.current.generatedContentItems.videos.market_insights).toHaveLength(1);
    });
  });

  it("persists updates back to session", async () => {
    const { result } = renderHook(() => useDashboardSessionCache());

    act(() => {
      result.current.setGeneratedContentItems((prev) => ({
        ...prev,
        videos: {
          ...prev.videos,
          market_insights: [{ id: "generated-2", hook: "New" }]
        }
      }));
    });

    await waitFor(() => {
      const nextRaw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      expect(nextRaw).toBeTruthy();
      expect(nextRaw).toContain("generated-2");
    });
  });

  it("removes invalid persisted state", async () => {
    const removeSpy = jest.spyOn(Storage.prototype, "removeItem");
    sessionStorage.setItem(SESSION_STORAGE_KEY, "{invalid");

    renderHook(() => useDashboardSessionCache());

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
    });
  });

  it("does not remove session key when value is absent", async () => {
    const removeSpy = jest.spyOn(Storage.prototype, "removeItem");

    renderHook(() => useDashboardSessionCache());

    await waitFor(() => {
      expect(removeSpy).not.toHaveBeenCalled();
    });
  });

  it("swallows storage write errors", async () => {
    const setItemSpy = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota exceeded");
      });

    expect(() => renderHook(() => useDashboardSessionCache())).not.toThrow();
    expect(setItemSpy).toHaveBeenCalled();
  });
});
