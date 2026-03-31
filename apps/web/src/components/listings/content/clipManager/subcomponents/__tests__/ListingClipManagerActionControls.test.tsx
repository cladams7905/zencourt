import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListingClipManagerActionControls } from "@web/src/components/listings/content/clipManager/subcomponents/ListingClipManagerActionControls";

describe("ListingClipManagerActionControls", () => {
  it("renders action controls and expands customize prompt flow", async () => {
    const user = userEvent.setup();
    const handleOpenCustomize = jest.fn();

    render(
      <ListingClipManagerActionControls
        selectedVersionId="clip-version-1"
        versions={
          [
            {
              id: "clip-1",
              clipVersionId: "clip-version-1",
              roomName: "Kitchen",
              generatedAt: "2026-03-19T12:30:00.000Z"
            }
          ] as never
        }
        selectedVersionHasVideo
        selectedClipIsRegenerating={false}
        selectedClipBatchId={undefined}
        isSubmitting={false}
        isSelectingVersion={false}
        isCanceling={false}
        hasSelectedItem
        isRegenerateMenuOpen={true}
        isCustomizeExpanded={false}
        draftAiDirections="Forward pan through the Kitchen."
        onVersionChange={jest.fn()}
        onDownload={jest.fn()}
        onCancel={jest.fn()}
        onRegenerateMenuOpenChange={jest.fn()}
        onQuickRegenerate={jest.fn()}
        onOpenCustomize={handleOpenCustomize}
        onBackToQuickActions={jest.fn()}
        onDraftAiDirectionsChange={jest.fn()}
        onSubmitCustomizedRegeneration={jest.fn()}
        formatGeneratedAt={() => "Mar 19, 8:30 AM"}
      />
    );

    expect(screen.getByText("Quick regenerate")).toBeInTheDocument();
    expect(screen.getByText("Customize prompt")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /customize prompt/i }));

    expect(handleOpenCustomize).toHaveBeenCalled();
  });
});
