import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import type { PlayablePreview } from "@web/src/components/listings/create/shared/types";
import { VideoPreviewModal } from "@web/src/components/listings/create/media/video/components/VideoPreviewModal";

const mockPlayer = jest.fn<React.ReactNode, [unknown]>(
  () => <div data-testid="video-player" />
);
const mockOnOpenChange = jest.fn();
const mockOnSave = jest.fn();

jest.mock("@remotion/player", () => ({
  Player: (props: unknown) => mockPlayer(props)
}));

jest.mock("@web/src/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div data-testid="dialog-root">{children}</div> : null),
  DialogClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>
}));

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

function createSelectedPreview(overrides?: Partial<ContentItem>): PlayablePreview {
  return {
    id: "preview-1",
    resolvedSegments: [
      {
        clipId: "clip-1",
        src: "https://video/1.mp4",
        thumbnailSrc: "https://img/1.jpg",
        category: "kitchen",
        durationSeconds: 2.5
      },
      {
        clipId: "clip-2",
        src: "https://video/2.mp4",
        thumbnailSrc: "https://img/2.jpg",
        category: "exterior",
        durationSeconds: 5
      }
    ],
    thumbnailOverlay: null,
    thumbnailAddressOverlay: null,
    firstThumb: "https://img/1.jpg",
    durationInFrames: 165,
    variationNumber: 1,
    captionItem: {
      id: "caption-1",
      hook: "Original hook",
      caption: "Original caption",
      body: [{ header: "Slide one", content: "Slide body" }],
      cacheKeyTimestamp: 123,
      cacheKeyId: 4,
      ...overrides
    } as ContentItem,
    captionItemKey: {
      cacheKeyTimestamp: 123,
      cacheKeyId: 4,
      mediaType: "video"
    }
  };
}

describe("VideoPreviewModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSave.mockResolvedValue(undefined);
  });

  it("renders a player, timeline items, and editable hook/caption fields", () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        captionSubcategoryLabel="New Listing"
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    expect(screen.getByText("Reel Preview")).toBeInTheDocument();
    expect(screen.getByTestId("video-player")).toBeInTheDocument();
    expect(screen.getByLabelText("Header")).toHaveValue("Original hook");
    expect(screen.getByLabelText("Caption")).toHaveValue("Original caption");
    expect(screen.getByText("Kitchen")).toBeInTheDocument();
    expect(screen.getByText("Exterior")).toBeInTheDocument();
    expect(screen.queryByText("Transition 1")).not.toBeInTheDocument();
    expect(screen.getAllByAltText("Kitchen clip thumbnail").length).toBeGreaterThan(1);
    expect(screen.getAllByAltText("Exterior clip thumbnail").length).toBeGreaterThan(
      screen.getAllByAltText("Kitchen clip thumbnail").length
    );
    expect(screen.getByText("Timeline")).toBeInTheDocument();
  });

  it("keeps the player shell above a minimum desktop size", () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        captionSubcategoryLabel="New Listing"
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    expect(screen.getByTestId("video-player-shell").className).toContain("max-w-[340px]");
    expect(screen.getByTestId("video-player-shell").className).toContain("xl:h-[min(56vh,680px)]");
  });

  it("enables save when fields change and resets draft values on cancel", async () => {
    const user = userEvent.setup();

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        captionSubcategoryLabel="New Listing"
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    const headerInput = screen.getByLabelText("Header");
    const saveButton = screen.getByRole("button", { name: "Save" });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });

    expect(saveButton).toBeDisabled();

    await user.clear(headerInput);
    await user.type(headerInput, "Updated hook");

    expect(saveButton).toBeEnabled();

    await user.click(cancelButton);

    expect(headerInput).toHaveValue("Original hook");
    expect(saveButton).toBeDisabled();
  });

  it("saves trimmed hook and caption values and disables actions while saving", async () => {
    const user = userEvent.setup();
    let resolveSave: (() => void) | undefined;
    mockOnSave.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
    );

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        captionSubcategoryLabel="New Listing"
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    await user.clear(screen.getByLabelText("Header"));
    await user.type(screen.getByLabelText("Header"), "  Updated hook  ");
    await user.clear(screen.getByLabelText("Caption"));
    await user.type(screen.getByLabelText("Caption"), "  Updated caption  ");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockOnSave).toHaveBeenCalledWith({
      hook: "Updated hook",
      caption: "Updated caption",
      captionItemKey: {
        cacheKeyTimestamp: 123,
        cacheKeyId: 4,
        mediaType: "video"
      }
    });
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

    resolveSave?.();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
    );
  });

  it("shows an inline error when save fails", async () => {
    const user = userEvent.setup();
    mockOnSave.mockRejectedValueOnce(new Error("save failed"));

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        captionSubcategoryLabel="New Listing"
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    await user.clear(screen.getByLabelText("Header"));
    await user.type(screen.getByLabelText("Header"), "Updated hook");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("save failed")).toBeInTheDocument();
    expect(screen.getByLabelText("Header")).toHaveValue("Updated hook");
  });
});
