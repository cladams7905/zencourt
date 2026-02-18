import { render, screen, waitFor } from "@testing-library/react";
import VerifyEmailPage from "@web/src/app/(auth)/verifyEmail/page";

const mockReplace = jest.fn();
const mockGet = jest.fn();
const mockVerifyEmail = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => ({ get: mockGet })
}));

jest.mock("@stackframe/stack", () => ({
  useStackApp: () => ({ verifyEmail: mockVerifyEmail })
}));

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("shows an error when code is missing", async () => {
    mockGet.mockReturnValue(null);

    render(<VerifyEmailPage />);

    expect(
      screen.getByText(
        "No verification code found. Please check your email link."
      )
    ).toBeInTheDocument();
    expect(mockVerifyEmail).not.toHaveBeenCalled();
  });

  it("shows invalid/expired message when verification returns error", async () => {
    mockGet.mockReturnValue("code-1");
    mockVerifyEmail.mockResolvedValue({ status: "error" });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "This verification link is invalid or has expired. Please request a new one."
        )
      ).toBeInTheDocument();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("shows success and redirects to welcome", async () => {
    jest.useFakeTimers();
    mockGet.mockReturnValue("code-2");
    mockVerifyEmail.mockResolvedValue({ status: "ok" });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText("Email verified")).toBeInTheDocument();
    });

    jest.advanceTimersByTime(1500);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/welcome");
    });
  });

  it("shows network fallback message when verify throws", async () => {
    mockGet.mockReturnValue("code-3");
    mockVerifyEmail.mockRejectedValue(new Error("network"));

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Unable to verify your email right now. Please try again."
        )
      ).toBeInTheDocument();
    });
  });
});
