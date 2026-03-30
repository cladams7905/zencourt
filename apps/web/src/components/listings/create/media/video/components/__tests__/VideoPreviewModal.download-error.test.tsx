import * as React from "react";
import { ReadableStream } from "stream/web";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { VideoPreviewModal } from "@web/src/components/listings/create/media/video/components/VideoPreviewModal";

jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn()
  })
}));

jest.mock("@remotion/player", () => {
  const MockPlayer = React.forwardRef(() => <div data-testid="video-player" />);
  MockPlayer.displayName = "MockRemotionPlayer";
  return { Player: MockPlayer };
});

jest.mock("@web/src/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  )
}));

jest.mock("@web/src/components/ui/loading-image", () => ({
  LoadingImage: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.fill;
    return <img {...(rest as React.ComponentProps<"img">)} alt="" />;
  }
}));

jest.mock("@web/src/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogAction: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
}));

jest.mock("@web/src/components/listings/create/media/video/hooks", () => ({
  useUserMediaReelPickerInfinite: () => ({
    items: [],
    errorMessage: null,
    isInitialLoading: false,
    isLoadingMore: false,
    loadMoreRef: jest.fn(),
    retry: jest.fn()
  })
}));

function createSelectedPreview() {
  return {
    id: "preview-1",
    resolvedSegments: [
      {
        clipId: "clip-1",
        sourceType: "listing_clip" as const,
        sourceId: "clip-1",
        src: "https://video/1.mp4",
        thumbnailSrc: "https://img/1.jpg",
        category: "kitchen",
        durationSeconds: 2.5,
        maxDurationSeconds: 4,
        textOverlay: {
          text: "Original hook",
          position: "center" as const,
          background: "black" as const,
          font: "sans-modern" as const,
          templatePattern: "simple" as const,
          lines: [{ text: "Original hook", fontRole: "body" as const }],
          fontPairing: "contemporary-script" as const
        }
      }
    ],
    thumbnailOverlay: null,
    thumbnailAddressOverlay: null,
    firstThumb: "https://img/1.jpg",
    durationInFrames: 75,
    variationNumber: 1,
    captionItem: {
      id: "caption-1",
      hook: "Original hook",
      caption: "Original caption",
      cacheKeyTimestamp: 123,
      cacheKeyId: 4
    },
    captionItemKey: {
      contentSource: "cached_create" as const,
      cacheKeyTimestamp: 123,
      cacheKeyId: 4,
      subcategory: "new_listing" as const,
      mediaType: "video" as const
    }
  };
}

describe("VideoPreviewModal download errors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    URL.createObjectURL = jest.fn().mockReturnValue("blob:reel-preview");
    URL.revokeObjectURL = jest.fn();
    HTMLAnchorElement.prototype.click = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        message: "Video export failed in the render server."
      })
    }) as typeof fetch;
  });

  it("shows a toast when the reel download fails", async () => {
    const user = userEvent.setup();

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        listingId="listing-1"
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={jest.fn()}
        onSavePreviewText={jest.fn()}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Download reel preview" })
    );
    await user.click(
      await screen.findByRole("menuitem", { name: /Standard download/i })
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Video export failed in the render server."
      )
    );
  });

  it("shows an hourglass icon for queued downloads from parent state", () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        listingId="listing-1"
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={jest.fn()}
        onSavePreviewText={jest.fn()}
        downloadState={{
          isDownloading: true,
          progress: 0,
          status: "queued"
        }}
        onDownloadPreview={jest.fn()}
      />
    );

    expect(screen.getByTestId("reel-download-queued-icon")).toBeInTheDocument();
    expect(
      screen.queryByTestId("reel-download-progress-label")
    ).not.toBeInTheDocument();
  });

  it("shows premium phase copy for upscaling downloads", () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        listingId="listing-1"
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={jest.fn()}
        onSavePreviewText={jest.fn()}
        downloadState={{
          isDownloading: true,
          progress: 0.3,
          status: "upscaling"
        }}
      />
    );

    expect(screen.getByText("Upscaling room clips...")).toBeInTheDocument();
  });

  it("shows standard rendering copy for standard downloads", () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        listingId="listing-1"
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={jest.fn()}
        onSavePreviewText={jest.fn()}
        downloadState={{
          isDownloading: true,
          progress: 0.3,
          status: "rendering",
          quality: "standard"
        }}
      />
    );

    expect(screen.getByText("Rendering reel...")).toBeInTheDocument();
  });

  it("shows premium rendering copy for premium downloads", () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        listingId="listing-1"
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={jest.fn()}
        onSavePreviewText={jest.fn()}
        downloadState={{
          isDownloading: true,
          progress: 0.3,
          status: "rendering",
          quality: "premium"
        }}
      />
    );

    expect(screen.getByText("Rendering premium reel...")).toBeInTheDocument();
  });

  it("shows start and completion toasts and renders a percentage tracker during download", async () => {
    const user = userEvent.setup();
    const encoder = new TextEncoder();
    let releaseChunk: () => void = () => {};

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            exportId: "export-job-1",
            status: "queued",
            progress: 0
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            exportId: "export-job-1",
            status: "completed",
            progress: 1,
            downloadReady: true
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          "content-type": "video/mp4",
          "content-length": "10",
          "Content-Disposition": 'attachment; filename="reel-preview-1.mp4"'
        }),
        body: new ReadableStream({
          start(controller) {
            releaseChunk = () => {
              controller.enqueue(encoder.encode("12345"));
              controller.enqueue(encoder.encode("67890"));
              controller.close();
            };
          }
        })
      }) as typeof fetch;

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        listingId="listing-1"
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={jest.fn()}
        onSavePreviewText={jest.fn()}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Download reel preview" })
    );
    await user.click(
      await screen.findByRole("menuitem", { name: /Standard download/i })
    );

    expect(toast).toHaveBeenCalledWith("Started downloading reel preview.");
    await waitFor(() =>
      expect(
        screen.getByTestId("reel-download-progress-label")
      ).toHaveTextContent("100%")
    );
    expect(screen.getByTestId("reel-download-spinner")).toBeInTheDocument();

    await waitFor(() =>
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "/api/v1/listings/listing-1/reels/exports/export-job-1",
        { cache: "no-store" }
      )
    );

    releaseChunk();

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Reel download complete.")
    );
    await waitFor(() =>
      expect(
        screen.queryByTestId("reel-download-progress-label")
      ).not.toBeInTheDocument()
    );
  });

  it("updates the percentage tracker from polled render progress every second", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            exportId: "export-job-2",
            status: "queued",
            progress: 0
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            exportId: "export-job-2",
            status: "rendering",
            progress: 0.2,
            downloadReady: false
          }
        })
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            exportId: "export-job-2",
            status: "rendering",
            progress: 0.42,
            downloadReady: false
          }
        })
      }) as typeof fetch;

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        listingId="listing-1"
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={jest.fn()}
        onSavePreviewText={jest.fn()}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Download reel preview" })
    );
    await user.click(
      await screen.findByRole("menuitem", { name: /Standard download/i })
    );

    await waitFor(() =>
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        "/api/v1/listings/listing-1/reels/exports/export-job-2",
        { cache: "no-store" }
      )
    );

    await waitFor(() =>
      expect(
        screen.getByTestId("reel-download-progress-label")
      ).toHaveTextContent("20%")
    );

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() =>
      expect(
        screen.getByTestId("reel-download-progress-label")
      ).toHaveTextContent("42%")
    );

    jest.useRealTimers();
  });

  it("keeps the favorite button enabled while a download is in progress", async () => {
    const user = userEvent.setup();

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            exportId: "export-job-3",
            status: "queued",
            progress: 0
          }
        })
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            exportId: "export-job-3",
            status: "rendering",
            progress: 0.35,
            downloadReady: false
          }
        })
      }) as typeof fetch;

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        listingId="listing-1"
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={jest.fn()}
        onSavePreviewText={jest.fn()}
        onSaveAndFavoritePreview={jest.fn()}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Download reel preview" })
    );
    await user.click(
      await screen.findByRole("menuitem", { name: /Standard download/i })
    );

    await waitFor(() =>
      expect(
        screen.getByTestId("reel-download-progress-label")
      ).toHaveTextContent("35%")
    );

    expect(
      screen.getByRole("button", { name: "Favorite reel preview" })
    ).toBeEnabled();
  });
});
