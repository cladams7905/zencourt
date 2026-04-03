import { act, renderHook } from "@testing-library/react";
import { useUnsavedNavigationGuard } from "@web/src/components/shared/hooks/useUnsavedNavigationGuard";

describe("useUnsavedNavigationGuard", () => {
  const originalConfirm = window.confirm;

  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn();
  });

  afterEach(() => {
    window.confirm = originalConfirm;
    document.body.innerHTML = "";
  });

  it("registers a beforeunload handler when enabled", () => {
    renderHook(() =>
      useUnsavedNavigationGuard({
        enabled: true,
        message: "Unsaved changes will be lost. Continue?"
      })
    );

    const event = new Event("beforeunload") as BeforeUnloadEvent;
    Object.defineProperty(event, "returnValue", {
      writable: true,
      value: undefined
    });

    window.dispatchEvent(event);

    expect(event.returnValue).toBe("");
  });

  it("blocks same-origin anchor navigation when confirmation is declined", () => {
    (window.confirm as jest.Mock).mockReturnValue(false);

    renderHook(() =>
      useUnsavedNavigationGuard({
        enabled: true,
        message: "Unsaved changes will be lost. Continue?"
      })
    );

    const anchor = document.createElement("a");
    anchor.href = `${window.location.origin}/next-page`;
    document.body.appendChild(anchor);

    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0
    });

    anchor.dispatchEvent(event);

    expect(window.confirm).toHaveBeenCalledWith(
      "Unsaved changes will be lost. Continue?"
    );
    expect(event.defaultPrevented).toBe(true);
  });

  it("ignores links marked to bypass the unsaved guard", () => {
    renderHook(() =>
      useUnsavedNavigationGuard({
        enabled: true,
        message: "Unsaved changes will be lost. Continue?"
      })
    );

    const anchor = document.createElement("a");
    anchor.href = `${window.location.origin}/next-page`;
    anchor.setAttribute("data-ignore-unsaved", "true");
    document.body.appendChild(anchor);

    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0
    });

    anchor.dispatchEvent(event);

    expect(window.confirm).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("wraps explicit navigation callbacks in a confirmation check", () => {
    const navigate = jest.fn();
    (window.confirm as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() =>
      useUnsavedNavigationGuard({
        enabled: true,
        message: "Unsaved changes will be lost. Continue?"
      })
    );

    act(() => {
      result.current.confirmNavigation(navigate);
    });

    expect(navigate).not.toHaveBeenCalled();

    (window.confirm as jest.Mock).mockReturnValue(true);

    act(() => {
      result.current.confirmNavigation(navigate);
    });

    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
