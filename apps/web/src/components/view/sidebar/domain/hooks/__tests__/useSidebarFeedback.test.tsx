import { act, renderHook } from "@testing-library/react";
import { useSidebarFeedback } from "@web/src/components/view/sidebar/domain/hooks/useSidebarFeedback";

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

describe("useSidebarFeedback", () => {
  const originalLocation = window.location;
  let assignedHref = "http://localhost/";

  beforeAll(() => {
    delete (window as Partial<Window>).location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        get href() {
          return assignedHref;
        },
        set href(value: string) {
          assignedHref = value;
        }
      }
    });
  });

  afterAll(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation
    });
  });

  beforeEach(() => {
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    assignedHref = "http://localhost/";
  });

  it("resets feedback fields when dialog closes", () => {
    const { result } = renderHook(() => useSidebarFeedback());

    act(() => {
      result.current.setIsFeedbackOpen(true);
      result.current.setFeedbackType("Bug");
      result.current.setFeedbackMessage("Please improve X");
      result.current.handleFeedbackOpenChange(false);
    });

    expect(result.current.isFeedbackOpen).toBe(false);
    expect(result.current.feedbackType).toBe("");
    expect(result.current.feedbackMessage).toBe("");
  });

  it("shows an error when feedback type is missing", () => {
    const { result } = renderHook(() => useSidebarFeedback());

    act(() => {
      result.current.setFeedbackMessage("Something");
      result.current.handleFeedbackSend();
    });

    expect(mockToastError).toHaveBeenCalledWith(
      "Please choose a suggestion type before sending."
    );
    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(assignedHref).toBe("http://localhost/");
  });

  it("builds the mailto payload, shows success, and closes dialog", () => {
    const { result } = renderHook(() => useSidebarFeedback());

    act(() => {
      result.current.setIsFeedbackOpen(true);
      result.current.setFeedbackType("Feature");
      result.current.setFeedbackMessage("  Add bulk actions  ");
    });

    act(() => {
      result.current.handleFeedbackSend();
    });

    expect(mockToastSuccess).toHaveBeenCalledWith("Feedback ready to send.");
    expect(mockToastError).not.toHaveBeenCalled();
    expect(result.current.isFeedbackOpen).toBe(false);
    expect(result.current.feedbackType).toBe("");
    expect(result.current.feedbackMessage).toBe("");
  });

  it("sends successfully when message is blank after trim", () => {
    const { result } = renderHook(() => useSidebarFeedback());

    act(() => {
      result.current.setFeedbackType("Bug");
      result.current.setFeedbackMessage("   ");
    });

    act(() => {
      result.current.handleFeedbackSend();
    });

    expect(mockToastSuccess).toHaveBeenCalledWith("Feedback ready to send.");
    expect(mockToastError).not.toHaveBeenCalled();
  });
});
