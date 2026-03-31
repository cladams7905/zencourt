import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { ListingVideoPreviewGrid } from "@web/src/components/listings/content/video/VideoPreviewGrid";

const mockBuildPlayablePreviews = jest.fn();
const mockSaveListingVideoReel = jest.fn();
const mockSaveAndFavoriteListingVideoReel = jest.fn();
const mockHandleEnter = jest.fn();
const mockHandleLeave = jest.fn();
const mockVideoPreviewModal = jest.fn();

jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn()
  })
}));

jest.mock(
  "@web/src/components/listings/content/video/domain/videoPreviewViewModel",
  () => ({
    buildPlayablePreviews: (...args: unknown[]) =>
      mockBuildPlayablePreviews(...args)
  })
);

jest.mock("@web/src/components/listings/content/video/domain/hooks", () => ({
  useHoverReveal: () => ({
    activeId: null,
    revealedId: null,
    handleEnter: mockHandleEnter,
    handleLeave: mockHandleLeave
  })
}));

jest.mock("@web/src/server/actions/listings/content/reels", () => ({
  saveListingVideoReel: (...args: unknown[]) =>
    mockSaveListingVideoReel(...args),
  saveAndFavoriteListingVideoReel: (...args: unknown[]) =>
    mockSaveAndFavoriteListingVideoReel(...args)
}));

jest.mock(
  "@web/src/components/listings/content/video/subcomponents/VideoPreviewCard",
  () => ({
    VideoPreviewCard: (props: Record<string, unknown>) => (
      <button
        type="button"
        onClick={() => (props.onSelect as (() => void) | undefined)?.()}
      >
        {String(props.preview && (props.preview as { id: string }).id)}
        {props.isFavorite ? " favorite" : ""}
      </button>
    )
  })
);

jest.mock(
  "@web/src/components/listings/content/video/VideoPreviewModal",
  () => ({
    VideoPreviewModal: (props: Record<string, unknown>) => {
      mockVideoPreviewModal(props);
      return (
        <div>
          <div data-testid="modal-listing-id">{String(props.listingId)}</div>
          <div data-testid="modal-selected-preview-id">
            {String(
              (props.selectedPreview as { id?: string } | null | undefined)
                ?.id ?? ""
            )}
          </div>
          <div data-testid="modal-download-progress">
            {String(
              (
                props.downloadState as
                  | { progress?: number; status?: string }
                  | null
                  | undefined
              )?.progress ?? ""
            )}
          </div>
          <div data-testid="modal-download-status">
            {String(
              (
                props.downloadState as
                  | { progress?: number; status?: string }
                  | null
                  | undefined
              )?.status ?? ""
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              void (
                props.onSaveAndFavoritePreview as (
                  params: unknown
                ) => Promise<void>
              )?.({
                hook: "Updated hook"
              })
            }
          >
            Trigger favorite
          </button>
          <button
            type="button"
            onClick={() =>
              void (
                props.onDownloadPreview as
                  | ((params: unknown) => Promise<void>)
                  | undefined
              )?.({
                filenameBase: "reel-preview-1",
                segments: []
              })
            }
          >
            Trigger download
          </button>
          <button
            type="button"
            onClick={() =>
              (props.onOpenChange as ((open: boolean) => void) | undefined)?.(
                false
              )
            }
          >
            Close modal
          </button>
        </div>
      );
    }
  })
);

describe("ListingVideoPreviewGrid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildPlayablePreviews.mockReturnValue([
      {
        id: "preview-1",
        resolvedSegments: [],
        thumbnailOverlay: null,
        thumbnailAddressOverlay: null,
        firstThumb: null,
        durationInFrames: 1,
        variationNumber: 1,
        captionItem: {
          id: "caption-1",
          isFavorite: true
        },
        captionItemKey: {
          contentSource: "saved_content",
          savedContentId: "saved-content-1"
        }
      }
    ]);
    mockSaveListingVideoReel.mockResolvedValue({
      id: "saved-saved-content-1"
    });
    mockSaveAndFavoriteListingVideoReel.mockResolvedValue({
      id: "saved-saved-content-1",
      isFavorite: true
    });
  });

  it("passes listingId into the modal and derives favorite state from persisted content", async () => {
    const user = userEvent.setup();

    render(
      <ListingVideoPreviewGrid
        listingId="listing-1"
        plans={[]}
        items={[]}
        captionItems={[]}
        listingSubcategory="new_listing"
        listingAddress={null}
        openHouseContext={null}
        userMediaVideoCount={0}
        onReplacePreviewItem={jest.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: /preview-1 favorite/i })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /preview-1 favorite/i })
    );

    expect(screen.getByTestId("modal-listing-id")).toHaveTextContent(
      "listing-1"
    );
  });

  it("calls save-and-favorite and replaces the preview item after success", async () => {
    const user = userEvent.setup();
    const onReplacePreviewItem = jest.fn();

    render(
      <ListingVideoPreviewGrid
        listingId="listing-1"
        plans={[]}
        items={[]}
        captionItems={[]}
        listingSubcategory="new_listing"
        listingAddress={null}
        openHouseContext={null}
        userMediaVideoCount={0}
        onReplacePreviewItem={onReplacePreviewItem}
      />
    );

    await user.click(
      screen.getByRole("button", { name: /preview-1 favorite/i })
    );
    await user.click(screen.getByRole("button", { name: "Trigger favorite" }));

    expect(mockSaveAndFavoriteListingVideoReel).toHaveBeenCalledWith(
      "listing-1",
      {
        hook: "Updated hook"
      }
    );
    expect(onReplacePreviewItem).toHaveBeenCalledWith({
      previousContentItemId: "caption-1",
      nextItem: expect.objectContaining({
        id: "saved-saved-content-1",
        isFavorite: true
      })
    });
  });

  it("preserves download state for the same reel across modal close and reopen", async () => {
    const user = userEvent.setup();
    const originalFetch = global.fetch;

    mockBuildPlayablePreviews.mockReturnValue([
      {
        id: "preview-1",
        resolvedSegments: [],
        thumbnailOverlay: null,
        thumbnailAddressOverlay: null,
        firstThumb: null,
        durationInFrames: 1,
        variationNumber: 1,
        captionItem: {
          id: "caption-1",
          isFavorite: false
        },
        captionItemKey: {
          contentSource: "saved_content",
          savedContentId: "saved-content-1"
        }
      },
      {
        id: "preview-2",
        resolvedSegments: [],
        thumbnailOverlay: null,
        thumbnailAddressOverlay: null,
        firstThumb: null,
        durationInFrames: 1,
        variationNumber: 2,
        captionItem: {
          id: "caption-2",
          isFavorite: false
        },
        captionItemKey: {
          contentSource: "saved_content",
          savedContentId: "saved-content-2"
        }
      }
    ]);

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          exportId: "export-job-1",
          status: "queued",
          progress: 0,
          downloadReady: false
        }
      })
    }) as typeof fetch;

    render(
      <ListingVideoPreviewGrid
        listingId="listing-1"
        plans={[]}
        items={[]}
        captionItems={[]}
        listingSubcategory="new_listing"
        listingAddress={null}
        openHouseContext={null}
        userMediaVideoCount={0}
        onReplacePreviewItem={jest.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /preview-1/i }));
    expect(screen.getByTestId("modal-selected-preview-id")).toHaveTextContent(
      "preview-1"
    );

    await user.click(screen.getByRole("button", { name: "Trigger download" }));
    expect(screen.getByTestId("modal-download-progress")).toHaveTextContent(
      "0"
    );
    expect(screen.getByTestId("modal-download-status")).toHaveTextContent(
      "queued"
    );
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        "Queuing reel preview for download, waiting for other downloads to finish."
      )
    );

    await user.click(screen.getByRole("button", { name: "Close modal" }));
    await user.click(screen.getByRole("button", { name: /preview-2/i }));
    expect(screen.getByTestId("modal-selected-preview-id")).toHaveTextContent(
      "preview-2"
    );
    expect(screen.getByTestId("modal-download-progress")).toBeEmptyDOMElement();
    expect(screen.getByTestId("modal-download-status")).toBeEmptyDOMElement();

    await user.click(screen.getByRole("button", { name: "Close modal" }));
    await user.click(screen.getByRole("button", { name: /preview-1/i }));
    expect(screen.getByTestId("modal-selected-preview-id")).toHaveTextContent(
      "preview-1"
    );
    expect(screen.getByTestId("modal-download-progress")).toHaveTextContent(
      "0"
    );
    expect(screen.getByTestId("modal-download-status")).toHaveTextContent(
      "queued"
    );

    global.fetch = originalFetch;
  });
});
