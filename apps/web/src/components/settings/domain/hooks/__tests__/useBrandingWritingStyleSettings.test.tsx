import { act, renderHook } from "@testing-library/react";
import { useBrandingWritingStyleSettings } from "@web/src/components/settings/domain/hooks/useBrandingWritingStyleSettings";

const mockRefresh = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockMarkWritingStyleCompleted = jest.fn();
const mockUpdateWritingStyle = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh
  })
}));

jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

jest.mock("@web/src/server/actions/db/userAdditional", () => ({
  markWritingStyleCompleted: (...args: unknown[]) =>
    mockMarkWritingStyleCompleted(...args),
  updateWritingStyle: (...args: unknown[]) => mockUpdateWritingStyle(...args)
}));

describe("useBrandingWritingStyleSettings", () => {
  let observeMock: jest.Mock;
  let disconnectMock: jest.Mock;
  let observerCallback: ((entries: Array<{ isIntersecting: boolean }>) => void) | null;

  beforeEach(() => {
    mockRefresh.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockMarkWritingStyleCompleted.mockReset();
    mockUpdateWritingStyle.mockReset();
    observeMock = jest.fn();
    disconnectMock = jest.fn();
    observerCallback = null;

    (global as typeof globalThis & { IntersectionObserver: unknown }).IntersectionObserver =
      jest.fn((cb: typeof observerCallback) => {
        observerCallback = cb;
        return {
          observe: observeMock,
          disconnect: disconnectMock
        };
      }) as unknown as typeof IntersectionObserver;
  });

  it("derives tone metadata and dirty state", () => {
    const { result } = renderHook(() =>
      useBrandingWritingStyleSettings({
        userId: "u1",
        userAdditional: {
          writingToneLevel: 3,
          writingStyleCustom: ""
        } as never,
        isActive: true
      })
    );

    expect(result.current.toneValue).toBe(3);
    expect(result.current.toneMeta.label).toBe("Conversational");
    expect(result.current.isWritingStyleDirty).toBe(false);

    act(() => {
      result.current.setWritingToneLevel(5);
    });

    expect(result.current.isWritingStyleDirty).toBe(true);
  });

  it("saves writing style and clears dirty state", async () => {
    mockUpdateWritingStyle.mockResolvedValue({});

    const { result } = renderHook(() =>
      useBrandingWritingStyleSettings({
        userId: "u1",
        userAdditional: {
          writingToneLevel: 3,
          writingStyleCustom: ""
        } as never,
        isActive: true
      })
    );

    act(() => {
      result.current.setWritingToneLevel(4);
      result.current.setWritingStyleCustom("Friendly");
    });

    await act(async () => {
      await result.current.handleSaveWritingStyle();
    });

    expect(mockUpdateWritingStyle).toHaveBeenCalledWith("u1", {
      writingToneLevel: 4,
      writingStyleCustom: "Friendly"
    });
    expect(mockRefresh).toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Writing style updated successfully!"
    );
    expect(result.current.isWritingStyleDirty).toBe(false);
  });

  it("marks writing style completed when sentinel intersects", () => {
    const { result, rerender } = renderHook(
      ({ isActive }) =>
        useBrandingWritingStyleSettings({
          userId: "u1",
          userAdditional: {
            writingToneLevel: 3,
            writingStyleCustom: "",
            writingStyleCompletedAt: null
          } as never,
          isActive
        }),
      {
        initialProps: { isActive: false }
      }
    );

    act(() => {
      result.current.writingStyleSentinelRef.current = document.createElement("div");
    });
    rerender({ isActive: true });

    expect(observeMock).toHaveBeenCalled();

    act(() => {
      observerCallback?.([{ isIntersecting: true }]);
    });

    expect(mockMarkWritingStyleCompleted).toHaveBeenCalledWith("u1");
    expect(disconnectMock).toHaveBeenCalled();
  });

  it("surfaces save failure", async () => {
    mockUpdateWritingStyle.mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() =>
      useBrandingWritingStyleSettings({
        userId: "u1",
        userAdditional: {
          writingToneLevel: 3,
          writingStyleCustom: ""
        } as never,
        isActive: true
      })
    );

    await act(async () => {
      await result.current.handleSaveWritingStyle();
    });

    expect(mockToastError).toHaveBeenCalledWith("fail");
    expect(result.current.isLoadingStyle).toBe(false);
  });
});
