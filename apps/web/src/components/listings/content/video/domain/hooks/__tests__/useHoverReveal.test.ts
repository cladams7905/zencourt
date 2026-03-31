import { act, renderHook } from "@testing-library/react";
import { useHoverReveal } from "../useHoverReveal";

describe("useHoverReveal", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts with no active or revealed id", () => {
    const { result } = renderHook(() =>
      useHoverReveal({ revealDelayMs: 50, hideDelayMs: 50 })
    );

    expect(result.current.activeId).toBeNull();
    expect(result.current.revealedId).toBeNull();
  });

  it("sets active immediately and reveals after the reveal delay", () => {
    const { result } = renderHook(() =>
      useHoverReveal({ revealDelayMs: 100, hideDelayMs: 50 })
    );

    act(() => {
      result.current.handleEnter("card-1");
    });

    expect(result.current.activeId).toBe("card-1");
    expect(result.current.revealedId).toBeNull();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.revealedId).toBe("card-1");
  });

  it("clears revealed on leave and clears active after the hide delay", () => {
    const { result } = renderHook(() =>
      useHoverReveal({ revealDelayMs: 30, hideDelayMs: 80 })
    );

    act(() => {
      result.current.handleEnter("a");
      jest.advanceTimersByTime(30);
    });
    expect(result.current.revealedId).toBe("a");

    act(() => {
      result.current.handleLeave();
    });
    expect(result.current.revealedId).toBeNull();
    expect(result.current.activeId).toBe("a");

    act(() => {
      jest.advanceTimersByTime(80);
    });
    expect(result.current.activeId).toBeNull();
  });

  it("re-targeting before reveal fires only reveals the latest id", () => {
    const { result } = renderHook(() =>
      useHoverReveal({ revealDelayMs: 100, hideDelayMs: 50 })
    );

    act(() => {
      result.current.handleEnter("first");
      jest.advanceTimersByTime(40);
      result.current.handleEnter("second");
    });

    expect(result.current.activeId).toBe("second");
    expect(result.current.revealedId).toBeNull();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.revealedId).toBe("second");
  });
});
