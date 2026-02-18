import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SettingsUnsavedChangesDialog } from "@web/src/components/settings/components/SettingsUnsavedChangesDialog";
import { URL as NodeURL } from "url";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush
  })
}));

describe("SettingsUnsavedChangesDialog", () => {
  const originalURL = global.URL;

  beforeAll(() => {
    Object.defineProperty(global, "URL", {
      writable: true,
      value: Object.assign(NodeURL, {
        createObjectURL: () => "blob:test",
        revokeObjectURL: () => {}
      })
    });
  });

  afterAll(() => {
    Object.defineProperty(global, "URL", {
      writable: true,
      value: originalURL
    });
  });

  beforeEach(() => {
    mockPush.mockReset();
    document.body.innerHTML = "";
  });

  it("intercepts internal navigation and supports discard", async () => {
    render(
      <>
        <a href="/dashboard">Go dashboard</a>
        <SettingsUnsavedChangesDialog isDirty onSave={jest.fn().mockResolvedValue(undefined)} />
      </>
    );

    fireEvent.click(screen.getByText("Go dashboard"));

    await waitFor(() => {
      expect(screen.getByText("Save changes before leaving?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("ignores hash-only links", () => {
    render(
      <>
        <a href="#profile">Jump</a>
        <SettingsUnsavedChangesDialog isDirty onSave={jest.fn().mockResolvedValue(undefined)} />
      </>
    );

    fireEvent.click(screen.getByText("Jump"));

    expect(screen.queryByText("Save changes before leaving?")).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("saves then navigates when user confirms", async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    render(
      <>
        <a href="/settings?tab=branding">Go settings</a>
        <SettingsUnsavedChangesDialog isDirty onSave={onSave} />
      </>
    );

    fireEvent.click(screen.getByText("Go settings"));

    await waitFor(() => {
      expect(screen.getByText("Save changes before leaving?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
    expect(mockPush).toHaveBeenCalledWith("/settings?tab=branding");
  });
});
