import { act, renderHook, waitFor } from "@testing-library/react";
import { useSettingsNavigation } from "@web/src/components/settings/domain/hooks/useSettingsNavigation";

describe("useSettingsNavigation", () => {
  const originalHash = window.location.hash;
  const originalRaf = window.requestAnimationFrame;

  beforeEach(() => {
    window.location.hash = "";
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    }) as typeof window.requestAnimationFrame;
  });

  afterAll(() => {
    window.location.hash = originalHash;
    window.requestAnimationFrame = originalRaf;
  });

  it("initializes active tab from hash and reacts to hashchange", async () => {
    window.location.hash = "#profile";

    const { result } = renderHook(() => useSettingsNavigation());

    await waitFor(() => {
      expect(result.current.activeTab).toBe("branding");
    });

    act(() => {
      window.location.hash = "#subscription";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    await waitFor(() => {
      expect(result.current.activeTab).toBe("subscription");
    });
  });

  it("scrolls to hash target once tab sync happens", async () => {
    const section = document.createElement("div");
    section.id = "writing-style";
    section.scrollIntoView = jest.fn();
    document.body.appendChild(section);

    renderHook(() => useSettingsNavigation());

    act(() => {
      window.location.hash = "#writing-style";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    await waitFor(() => {
      expect(section.scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "start"
      });
    });

    section.remove();
  });
});
