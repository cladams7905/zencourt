import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@web/src/components/ui/loading-image", () => ({
  LoadingImage: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.fill;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        {...(rest as React.ComponentProps<"img">)}
        alt={(rest.alt as string) ?? ""}
      />
    );
  }
}));

import {
  ListingClipManagerClipList,
  ListingClipManagerActionControls,
  ListingClipManagerDesktopDetail,
  ListingClipManagerVideoPlayer
} from "@web/src/components/listings/create/components/ListingClipManagerWorkspaceParts";
import type { ListingClipVersionItem } from "@web/src/components/listings/create/shared/types";

describe("ListingClipManagerWorkspaceParts", () => {
  const items: ListingClipVersionItem[] = [
    {
      clipId: "clip-1",
      roomName: "Kitchen",
      roomId: "room-1",
      clipIndex: 0,
      sortOrder: 0,
      currentVersion: {
        id: "clip-1",
        clipVersionId: "clip-version-1",
        roomName: "Kitchen",
        thumbnail: "https://thumb",
        videoUrl: "https://video",
        aiDirections: "Warm light",
        durationSeconds: 4,
        versionNumber: 1,
        versionStatus: "completed",
        generatedAt: "2026-03-19T12:30:00.000Z"
      },
      versions: []
    }
  ] as never;

  it("renders the preview viewport with cover video styling", () => {
    const { container } = render(
      <ListingClipManagerVideoPlayer
        videoUrl="https://video"
        posterUrl="https://thumb"
      />
    );

    expect(screen.getByTestId("clip-preview-viewport")).toHaveClass("aspect-9/16");
    expect(container.querySelector("video")).toHaveClass("object-cover");
  });

  it("renders the clip list item regeneration label", () => {
    render(
      <ListingClipManagerClipList
        clipItems={items}
        selectedClipId="clip-1"
        isDesktopLayout
        onSelectClip={jest.fn()}
        getItemThumbnail={() => "https://thumb"}
        getItemDuration={() => 4}
        isItemRegenerating={() => true}
        formatDuration={(value) => `${value}s`}
        formatGeneratedAt={() => "Mar 19, 8:30 AM"}
        renderSelectedMobileDetail={() => null}
      />
    );

    expect(screen.getByText("Regenerating now")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/clip regeneration in progress/i)
    ).toBeInTheDocument();
  });

  it("renders the desktop detail header and action controls", () => {
    render(
      <ListingClipManagerDesktopDetail
        roomName="Kitchen"
        generatedAtLabel="Regenerating now"
        durationLabel="4s"
        isRegenerating
        actions={
          <div>
            <p>Version</p>
            <button type="button">Cancel</button>
          </div>
        }
        player={
          <ListingClipManagerVideoPlayer
            videoUrl="https://video"
            posterUrl="https://thumb"
          />
        }
      />
    );

    expect(screen.getByTestId("desktop-clip-detail")).toBeInTheDocument();
    expect(screen.getByText("Kitchen")).toBeInTheDocument();
    expect(screen.getByText("Regenerating now")).toBeInTheDocument();
    expect(screen.getByText("Regenerating")).toBeInTheDocument();
    expect(screen.getByText("Version")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders action controls and expands customize prompt flow", async () => {
    const user = userEvent.setup();
    const handleOpenCustomize = jest.fn();

    render(
      <ListingClipManagerActionControls
        selectedVersionId="clip-version-1"
        versions={[
          {
            id: "clip-1",
            clipVersionId: "clip-version-1",
            roomName: "Kitchen",
            generatedAt: "2026-03-19T12:30:00.000Z"
          }
        ] as never}
        selectedVersionHasVideo
        selectedClipIsRegenerating={false}
        selectedClipBatchId={undefined}
        isSubmitting={false}
        isSelectingVersion={false}
        isCanceling={false}
        hasSelectedItem
        isRegenerateMenuOpen={true}
        isCustomizeExpanded={false}
        draftAiDirections="Warm light"
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
