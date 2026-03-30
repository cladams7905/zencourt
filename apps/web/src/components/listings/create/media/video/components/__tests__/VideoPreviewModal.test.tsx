import * as React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import type { PlayablePreview } from "@web/src/components/listings/create/shared/types";
import { VideoPreviewModal } from "@web/src/components/listings/create/media/video/components/VideoPreviewModal";

const mockPlayer = jest.fn<React.ReactNode, [unknown]>(
  () => <div data-testid="video-player" />
);
const mockOnOpenChange = jest.fn();
const mockOnSave = jest.fn();
const mockOnSaveAndFavorite = jest.fn();
const mockOnRegeneratePreviewText = jest.fn();
const mockSeekTo = jest.fn();
const mockPause = jest.fn();
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
const mockFetch = jest.fn();
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
const mockAnchorClick = jest.fn();
let mockCurrentFrame = 0;
const playerListeners = new Map<string, Set<(event: { detail: unknown }) => void>>();

function emitPlayerEvent(name: string, detail: unknown) {
  const listeners = playerListeners.get(name);
  listeners?.forEach((listener) => listener({ detail }));
}

jest.mock("@remotion/player", () => {
  const MockPlayer = React.forwardRef(
    (props: unknown, ref: React.ForwardedRef<unknown>) => {
      React.useImperativeHandle(ref, () => ({
        seekTo: mockSeekTo,
        pause: mockPause,
        getCurrentFrame: () => mockCurrentFrame,
        addEventListener: (
          name: string,
          callback: (event: { detail: unknown }) => void
        ) => {
          mockAddEventListener(name, callback);
          const listeners = playerListeners.get(name) ?? new Set();
          listeners.add(callback);
          playerListeners.set(name, listeners);
        },
        removeEventListener: (
          name: string,
          callback: (event: { detail: unknown }) => void
        ) => {
          mockRemoveEventListener(name, callback);
          playerListeners.get(name)?.delete(callback);
        }
      }));
      return mockPlayer(props);
    }
  );
  MockPlayer.displayName = "MockRemotionPlayer";
  return { Player: MockPlayer };
});

jest.mock("@web/src/components/ui/dialog", () => ({
  Dialog: ({
    open,
    onOpenChange,
    children
  }: {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
  }) =>
    open ? (
      <div data-testid="dialog-root">
        <button type="button" onClick={() => onOpenChange?.(false)}>
          Mock dialog dismiss
        </button>
        {children}
      </div>
    ) : null,
  DialogClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>
}));

jest.mock("@web/src/components/ui/alert-dialog", () => ({
  AlertDialog: ({
    open,
    children
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div data-testid="alert-dialog-root">{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogAction: ({
    children,
    onClick,
    ...props
  }: React.ComponentProps<"button">) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({
    children,
    onClick,
    ...props
  }: React.ComponentProps<"button">) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  )
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

const mockUseUserMediaReelPickerInfinite = jest.fn();
jest.mock("@web/src/components/listings/create/media/video/hooks", () => ({
  useUserMediaReelPickerInfinite: () => mockUseUserMediaReelPickerInfinite()
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
        roomName: "Kitchen",
        durationSeconds: 2.5,
        maxDurationSeconds: 4,
        textOverlay: {
          text: "Original hook",
          position: "center",
          background: "black",
          font: "sans-modern",
          templatePattern: "simple",
          lines: [{ text: "Original hook", fontRole: "body" }],
          fontPairing: "contemporary-script"
        }
      },
      {
        clipId: "clip-2",
        src: "https://video/2.mp4",
        thumbnailSrc: "https://img/2.jpg",
        category: "exterior",
        roomName: "Exterior",
        durationSeconds: 5,
        maxDurationSeconds: 6,
        textOverlay: {
          text: "Original hook",
          position: "center",
          background: "black",
          font: "sans-modern",
          templatePattern: "simple",
          lines: [{ text: "Original hook", fontRole: "body" }],
          fontPairing: "contemporary-script"
        }
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
      cacheKeyTimestamp: 123,
      cacheKeyId: 4,
      ...overrides
    } as ContentItem,
    captionItemKey: {
      contentSource: "cached_create",
      cacheKeyTimestamp: 123,
      cacheKeyId: 4,
      subcategory: "new_listing",
      mediaType: "video"
    }
  };
}

function createSelectedPreviewWithAddressOverlay(): PlayablePreview {
  const preview = createSelectedPreview();

  return {
    ...preview,
    resolvedSegments: preview.resolvedSegments.map((segment, index) => ({
      ...segment,
      supplementalAddressOverlay:
        index === 0
          ? {
              placement: "below-primary",
              overlay: {
                text: "123 Main St",
                position: "bottom-third",
                background: "black",
                font: "sans-modern",
                templatePattern: "simple",
                lines: [{ text: "123 Main St", fontRole: "body" }],
                fontPairing: "contemporary-script"
              }
            }
          : undefined
    }))
  };
}

function createSelectedPreviewWithId(
  previewId: string,
  overrides?: Partial<ContentItem>
): PlayablePreview {
  return {
    ...createSelectedPreview(overrides),
    id: previewId,
    captionItem: {
      ...createSelectedPreview(overrides).captionItem,
      id: `${previewId}-caption`
    }
  };
}

function StatefulVideoPreviewModal({
  onOpenChange = mockOnOpenChange,
  preview = createSelectedPreview()
}: {
  onOpenChange?: (open: boolean) => void;
  preview?: PlayablePreview;
}) {
  const [selectedPreview, setSelectedPreview] =
    React.useState<PlayablePreview | null>(preview);

  return (
    <VideoPreviewModal
      selectedPreview={selectedPreview}
      listingId="listing-1"
      userMediaVideoCount={0}
      previewFps={30}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          setSelectedPreview(null);
        }
      }}
      onSavePreviewText={mockOnSave}
      onSaveAndFavoritePreview={mockOnSaveAndFavorite}
      onRegeneratePreviewText={mockOnRegeneratePreviewText}
    />
  );
}

describe("VideoPreviewModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    playerListeners.clear();
    mockCurrentFrame = 0;
    mockOnSave.mockResolvedValue(undefined);
    mockOnSaveAndFavorite.mockResolvedValue(undefined);
    mockOnRegeneratePreviewText.mockResolvedValue({
      targetField: "hook",
      value: "Regenerated hook"
    });
    mockFetch.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["video"], { type: "video/mp4" }),
      headers: new Headers({
        "Content-Disposition": 'attachment; filename="reel-preview-1.mp4"'
      })
    });
    global.fetch = mockFetch as typeof fetch;
    URL.createObjectURL = mockCreateObjectURL.mockReturnValue(
      "blob:reel-preview"
    );
    URL.revokeObjectURL = mockRevokeObjectURL;
    HTMLAnchorElement.prototype.click = mockAnchorClick;
    mockUseUserMediaReelPickerInfinite.mockReturnValue({
      items: [],
      errorMessage: null,
      isInitialLoading: false,
      isLoadingMore: false,
      loadMoreRef: jest.fn(),
      retry: jest.fn()
    });
  });

  it("renders a player, timeline items, and editable hook/caption fields", () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    expect(screen.getByText("Reel Preview")).toBeInTheDocument();
    expect(screen.getByTestId("video-player")).toBeInTheDocument();
    expect(mockPlayer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        controls: true
      })
    );
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
    expect(screen.queryByText("Slide Notes")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Undo timeline change" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Redo timeline change" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Add clip to timeline" })
    ).toBeDisabled();
    expect(screen.getByTestId("timeline-total-duration")).toHaveTextContent(
      "7.5s"
    );
  });

  it("renders header and caption regenerate controls with tooltips", async () => {
    const user = userEvent.setup();

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
        onRegeneratePreviewText={mockOnRegeneratePreviewText}
      />
    );

    const headerButton = screen.getByRole("button", {
      name: "Regenerate header"
    });
    const captionButton = screen.getByRole("button", {
      name: "Regenerate caption"
    });

    await user.hover(headerButton);
    expect(
      (await screen.findAllByText("Regenerate header")).length
    ).toBeGreaterThan(0);

    await user.unhover(headerButton);
    await user.hover(captionButton);
    expect(
      (await screen.findAllByText("Regenerate caption")).length
    ).toBeGreaterThan(0);
  });

  it("updates only the targeted draft field during regeneration", async () => {
    const user = userEvent.setup();
    mockOnRegeneratePreviewText.mockImplementation(async (params) => ({
      targetField: params.targetField,
      value:
        params.targetField === "hook"
          ? "Fresh header"
          : params.customDirections?.trim()
            ? "Custom caption"
            : "Fallback caption"
    }));

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
        onRegeneratePreviewText={mockOnRegeneratePreviewText}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Regenerate header" })
    );
    await user.click(
      screen.getByRole("button", { name: /Random regenerate/i })
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Header")).toHaveValue("Fresh header");
    });
    expect(screen.getByLabelText("Caption")).toHaveValue("Original caption");

    await user.click(
      screen.getByRole("button", { name: "Regenerate caption" })
    );
    await user.click(screen.getByRole("button", { name: /Custom prompt/i }));
    await user.type(
      screen.getByLabelText("Directions"),
      "Make it punchier and shorter."
    );
    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));

    await waitFor(() => {
      expect(screen.getByLabelText("Caption")).toHaveValue("Custom caption");
    });
    expect(screen.getByLabelText("Header")).toHaveValue("Fresh header");

    expect(mockOnRegeneratePreviewText).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        targetField: "hook",
        mode: "random"
      })
    );
    expect(mockOnRegeneratePreviewText).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        targetField: "caption",
        mode: "custom",
        customDirections: "Make it punchier and shorter."
      })
    );
  });

  it("disables only the targeted field during regeneration and preserves draft on failure", async () => {
    const user = userEvent.setup();
    let rejectRegeneration: ((error: Error) => void) | undefined;
    mockOnRegeneratePreviewText.mockImplementation(
      () =>
        new Promise<never>((_, reject) => {
          rejectRegeneration = reject;
        })
    );

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
        onRegeneratePreviewText={mockOnRegeneratePreviewText}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Regenerate header" })
    );
    await user.click(
      screen.getByRole("button", { name: /Random regenerate/i })
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Header")).toBeDisabled();
    });
    expect(screen.getByLabelText("Caption")).toBeEnabled();

    rejectRegeneration?.(new Error("Regeneration failed."));

    await waitFor(() => {
      expect(screen.getByLabelText("Header")).toBeEnabled();
    });
    expect(screen.getByLabelText("Header")).toHaveValue("Original hook");
    expect(screen.getByLabelText("Caption")).toHaveValue("Original caption");
  });

  it("numbers duplicate room names in the timeline and room clips picker", async () => {
    const user = userEvent.setup();

    render(
      <VideoPreviewModal
        selectedPreview={{
          ...createSelectedPreview(),
          resolvedSegments: [
            {
              ...createSelectedPreview().resolvedSegments[0],
              clipId: "clip-1",
              category: "kitchen",
              roomName: "Kitchen"
            },
            {
              ...createSelectedPreview().resolvedSegments[1],
              clipId: "clip-2",
              category: "kitchen",
              roomName: "Kitchen"
            }
          ]
        }}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    expect(screen.getByText("Kitchen 1")).toBeInTheDocument();
    expect(screen.getByText("Kitchen 2")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("timeline-delete-clip-1-0"));
    await user.click(screen.getByRole("button", { name: "Add clip to timeline" }));

    expect(screen.getByTitle("Kitchen 1")).toBeInTheDocument();
  });

  it("renders overlay controls in the right column editor", () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    expect(screen.getByText("Overlay Style")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Black" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Brown" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "White" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Font" })).toHaveTextContent(
      "Modern Script"
    );
    expect(screen.getByRole("combobox", { name: "Position" })).toHaveTextContent(
      "Center"
    );
    expect(
      screen.getByRole("switch", { name: "Show address" })
    ).toBeInTheDocument();
  });

  it("renders download and favorite buttons in the stage container outside the player shell", () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        listingId="listing-1"
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
        onSaveAndFavoritePreview={mockOnSaveAndFavorite}
      />
    );

    expect(
      screen.getByRole("button", { name: "Download reel preview" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Favorite reel preview" })
    ).toBeInTheDocument();

    const stage = screen.getByTestId("video-preview-stage");
    const playerShell = screen.getByTestId("video-player-shell");

    expect(stage).toContainElement(
      screen.getByRole("button", { name: "Download reel preview" })
    );
    expect(stage).toContainElement(
      screen.getByRole("button", { name: "Favorite reel preview" })
    );
    expect(playerShell).not.toContainElement(
      screen.getByRole("button", { name: "Download reel preview" })
    );
    expect(playerShell).not.toContainElement(
      screen.getByRole("button", { name: "Favorite reel preview" })
    );
  });

  it("keeps the player shell sized for mobile and 1050px+ desktop layout", () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    const stage = screen.getByTestId("video-preview-stage").className;
    expect(stage).toContain("max-[1049px]:min-h-[min(38dvh,18rem)]");
    const shell = screen.getByTestId("video-player-shell").className;
    expect(shell).toContain("rounded-xl");
    expect(shell).toContain("bg-card");
    expect(shell).toContain("shadow-sm");
    expect(shell).toContain("min-w-[148px]");
    expect(shell).toContain("max-w-[min(160px");
    expect(shell).toContain("min-[1050px]:h-[86%]");
    expect(shell).toContain("min-[1050px]:w-auto");
  });

  it("enables save when fields change and resets draft values on cancel", async () => {
    const user = userEvent.setup();

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    const headerInput = screen.getByLabelText("Header");
    const saveButton = screen.getByTestId("reel-preview-save");
    const cancelButton = screen.getByTestId("reel-preview-cancel");

    expect(saveButton).toBeDisabled();

    await user.clear(headerInput);
    await user.type(headerInput, "Updated hook");

    expect(saveButton).toBeEnabled();

    await user.click(cancelButton);

    expect(headerInput).toHaveValue("Original hook");
    expect(saveButton).toBeDisabled();
  });

  it("marks overlay edits dirty and updates player input with the new overlay values", async () => {
    const user = userEvent.setup();

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreviewWithAddressOverlay()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    const saveButton = screen.getByTestId("reel-preview-save");

    expect(saveButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Brown 700" }));

    expect(saveButton).toBeEnabled();

    await waitFor(() =>
      expect(mockPlayer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          inputProps: expect.objectContaining({
            segments: expect.arrayContaining([
              expect.objectContaining({
                textOverlay: expect.objectContaining({
                  background: "brown-700",
                  position: "center",
                  fontPairing: "contemporary-script"
                }),
                supplementalAddressOverlay: expect.objectContaining({
                  overlay: expect.objectContaining({
                    background: "brown-700",
                    position: "center",
                    fontPairing: "contemporary-script"
                  })
                })
              })
            ])
          })
        })
      )
    );
  });

  it("resets overlay control values on cancel", async () => {
    const user = userEvent.setup();

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreviewWithAddressOverlay()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    expect(screen.getByRole("button", { name: "Black" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("switch", { name: "Show address" })).toHaveAttribute(
      "aria-checked",
      "true"
    );

    await user.click(screen.getByRole("button", { name: "White" }));
    await user.click(screen.getByRole("switch", { name: "Show address" }));
    await user.click(screen.getByTestId("reel-preview-cancel"));

    expect(screen.getByRole("button", { name: "Black" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "White" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("switch", { name: "Show address" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByTestId("reel-preview-save")).toBeDisabled();
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
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    await user.clear(screen.getByLabelText("Header"));
    await user.type(screen.getByLabelText("Header"), "  Updated hook  ");
    await user.clear(screen.getByLabelText("Caption"));
    await user.type(screen.getByLabelText("Caption"), "  Updated caption  ");

    await user.click(screen.getByTestId("reel-preview-save"));

    expect(mockOnSave).toHaveBeenCalledWith({
      hook: "Updated hook",
      caption: "Updated caption",
      overlayBackground: "black",
      overlayPosition: "center",
      overlayFontPairing: "contemporary-script",
      showAddress: false,
      orderedClipIds: ["clip-1", "clip-2"],
      clipDurationOverrides: { "clip-1": 2.5, "clip-2": 5 },
      sequence: [
        {
          sourceType: "listing_clip",
          sourceId: "clip-1",
          durationSeconds: 2.5
        },
        {
          sourceType: "listing_clip",
          sourceId: "clip-2",
          durationSeconds: 5
        }
      ],
      saveTarget: {
        contentSource: "cached_create",
        cacheKeyTimestamp: 123,
        cacheKeyId: 4,
        subcategory: "new_listing",
        mediaType: "video"
      }
    });
    const savingButton = screen.getByTestId("reel-preview-save");
    expect(savingButton).toHaveTextContent("Saving...");
    expect(savingButton).toBeDisabled();
    expect(screen.getByTestId("reel-preview-cancel")).toBeDisabled();

    resolveSave?.();

    await waitFor(() =>
      expect(screen.getByTestId("reel-preview-save")).toBeDisabled()
    );
  });

  it("saves and favorites the current dirty draft", async () => {
    const user = userEvent.setup();

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        listingId="listing-1"
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
        onSaveAndFavoritePreview={mockOnSaveAndFavorite}
      />
    );

    await user.clear(screen.getByLabelText("Header"));
    await user.type(screen.getByLabelText("Header"), "Favorited hook");
    fireEvent.dragStart(screen.getByTestId("timeline-clip-clip-2-1"));
    fireEvent.dragOver(screen.getByTestId("timeline-clip-clip-1-0"));
    fireEvent.drop(screen.getByTestId("timeline-clip-clip-1-0"));

    await user.click(screen.getByRole("button", { name: "Favorite reel preview" }));

    expect(mockOnSaveAndFavorite).toHaveBeenCalledWith({
      hook: "Favorited hook",
      caption: "Original caption",
      overlayBackground: "black",
      overlayPosition: "center",
      overlayFontPairing: "contemporary-script",
      showAddress: false,
      orderedClipIds: ["clip-2", "clip-1"],
      clipDurationOverrides: { "clip-2": 5, "clip-1": 2.5 },
      sequence: [
        {
          sourceType: "listing_clip",
          sourceId: "clip-2",
          durationSeconds: 5
        },
        {
          sourceType: "listing_clip",
          sourceId: "clip-1",
          durationSeconds: 2.5
        }
      ],
      saveTarget: {
        contentSource: "cached_create",
        cacheKeyTimestamp: 123,
        cacheKeyId: 4,
        subcategory: "new_listing",
        mediaType: "video"
      }
    });
  });

  it("opens a download menu and posts a premium export payload from the dirty draft", async () => {
    const user = userEvent.setup();

    mockFetch
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
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            exportId: "export-job-1",
            status: "rendering",
            progress: 0.25,
            downloadReady: false
          }
        })
      });

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreviewWithAddressOverlay()}
        listingId="listing-1"
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
        onSaveAndFavoritePreview={mockOnSaveAndFavorite}
      />
    );

    await user.click(screen.getByRole("button", { name: "Brown 700" }));
    await user.click(screen.getByRole("button", { name: "Download reel preview" }));
    expect(
      await screen.findByRole("menuitem", { name: "Standard download" })
    ).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Premium 4K download" })
    ).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Premium 4K download" }));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/listings/listing-1/reels/exports",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
    );

    const [, requestInit] = mockFetch.mock.calls[0] as [
      string,
      RequestInit & { body: string }
    ];
    expect(JSON.parse(requestInit.body)).toEqual({
      filenameBase: "reel-preview-1",
      quality: "premium",
      segments: [
        {
          sourceType: "listing_clip",
          sourceId: "clip-1",
          durationSeconds: 2.5,
          textOverlay: expect.objectContaining({
            background: "brown-700",
            text: "Original hook"
          }),
          supplementalAddressOverlay: expect.objectContaining({
            placement: "below-primary",
            overlay: expect.objectContaining({
              background: "brown-700",
              text: "123 Main St"
            })
          })
        },
        {
          sourceType: "listing_clip",
          sourceId: "clip-2",
          durationSeconds: 5,
          textOverlay: expect.objectContaining({
            background: "brown-700",
            text: "Original hook"
          }),
          supplementalAddressOverlay: expect.objectContaining({
            placement: "below-primary",
            overlay: expect.objectContaining({
              background: "brown-700",
              text: "123 Main St"
            })
          })
        }
      ]
    });
  });

  it("shows an inline error when save fails", async () => {
    const user = userEvent.setup();
    mockOnSave.mockRejectedValueOnce(new Error("save failed"));

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    await user.clear(screen.getByLabelText("Header"));
    await user.type(screen.getByLabelText("Header"), "Updated hook");
    await user.click(screen.getByTestId("reel-preview-save"));

    expect(await screen.findByText("save failed")).toBeInTheDocument();
    expect(screen.getByLabelText("Header")).toHaveValue("Updated hook");
  });

  it("opens a discard confirmation instead of closing from the header button when dirty", async () => {
    const user = userEvent.setup();

    render(<StatefulVideoPreviewModal />);

    await user.clear(screen.getByLabelText("Header"));
    await user.type(screen.getByLabelText("Header"), "Updated hook");
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(
      screen.getByText("Leave reel preview without saving?")
    ).toBeInTheDocument();
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByTestId("dialog-root")).toBeInTheDocument();
  });

  it("discards dirty changes and closes after confirming", async () => {
    const user = userEvent.setup();

    render(<StatefulVideoPreviewModal />);

    await user.clear(screen.getByLabelText("Header"));
    await user.type(screen.getByLabelText("Header"), "Updated hook");
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(
      screen.getByRole("button", { name: "Continue Without Saving" })
    );

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByTestId("dialog-root")).not.toBeInTheDocument();
  });

  it("resets overlay control values before closing on discard confirm", async () => {
    const user = userEvent.setup();

    render(
      <StatefulVideoPreviewModal preview={createSelectedPreviewWithAddressOverlay()} />
    );

    await user.click(screen.getByRole("button", { name: "White" }));
    await user.click(screen.getByRole("switch", { name: "Show address" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(
      screen.getByRole("button", { name: "Continue Without Saving" })
    );

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreviewWithAddressOverlay()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    expect(screen.getByRole("button", { name: "Black" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("switch", { name: "Show address" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  it("opens the discard confirmation for dialog dismiss requests when dirty", async () => {
    const user = userEvent.setup();

    render(<StatefulVideoPreviewModal />);

    await user.clear(screen.getByLabelText("Header"));
    await user.type(screen.getByLabelText("Header"), "Updated hook");
    await user.click(screen.getByRole("button", { name: "Mock dialog dismiss" }));

    expect(
      screen.getByText("Leave reel preview without saving?")
    ).toBeInTheDocument();
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("closes immediately for dialog dismiss requests when clean", async () => {
    const user = userEvent.setup();

    render(<StatefulVideoPreviewModal />);

    await user.click(screen.getByRole("button", { name: "Mock dialog dismiss" }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByTestId("dialog-root")).not.toBeInTheDocument();
  });

  it("reorders timeline clips, updates the player input, and saves the new clip order", async () => {
    const user = userEvent.setup();

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    fireEvent.dragStart(screen.getByTestId("timeline-clip-clip-2-1"));
    fireEvent.dragOver(screen.getByTestId("timeline-clip-clip-1-0"));

    expect(screen.getByTestId("timeline-clip-clip-1-0")).toHaveStyle({
      borderColor: "hsl(var(--primary))"
    });

    fireEvent.drop(screen.getByTestId("timeline-clip-clip-1-0"));

    await waitFor(() =>
      expect(mockPlayer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          inputProps: expect.objectContaining({
            segments: expect.arrayContaining([
              expect.objectContaining({ clipId: "clip-2" }),
              expect.objectContaining({ clipId: "clip-1" })
            ])
          })
        })
      )
    );

    await user.click(screen.getByTestId("reel-preview-save"));

    expect(mockOnSave).toHaveBeenCalledWith({
      hook: "Original hook",
      caption: "Original caption",
      overlayBackground: "black",
      overlayPosition: "center",
      overlayFontPairing: "contemporary-script",
      showAddress: false,
      orderedClipIds: ["clip-2", "clip-1"],
      clipDurationOverrides: { "clip-2": 5, "clip-1": 2.5 },
      sequence: [
        {
          sourceType: "listing_clip",
          sourceId: "clip-2",
          durationSeconds: 5
        },
        {
          sourceType: "listing_clip",
          sourceId: "clip-1",
          durationSeconds: 2.5
        }
      ],
      saveTarget: {
        contentSource: "cached_create",
        cacheKeyTimestamp: 123,
        cacheKeyId: 4,
        subcategory: "new_listing",
        mediaType: "video"
      }
    });
  });

  it("shows a grab cursor on the card body for reorder interactions", () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    expect(screen.getByTestId("timeline-clip-clip-1-0")).toHaveStyle({
      cursor: "grab"
    });
  });

  it("supports undo and redo for reorder changes", async () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    const undoButton = screen.getByRole("button", {
      name: "Undo timeline change"
    });
    const redoButton = screen.getByRole("button", {
      name: "Redo timeline change"
    });

    fireEvent.dragStart(screen.getByTestId("timeline-clip-clip-2-1"));
    fireEvent.dragOver(screen.getByTestId("timeline-clip-clip-1-0"));
    fireEvent.drop(screen.getByTestId("timeline-clip-clip-1-0"));

    expect(undoButton).toBeEnabled();
    expect(redoButton).toBeDisabled();

    fireEvent.click(undoButton);

    await waitFor(() =>
      expect(mockPlayer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          inputProps: expect.objectContaining({
            segments: expect.arrayContaining([
              expect.objectContaining({ clipId: "clip-1" }),
              expect.objectContaining({ clipId: "clip-2" })
            ])
          })
        })
      )
    );

    expect(redoButton).toBeEnabled();

    fireEvent.click(redoButton);

    await waitFor(() =>
      expect(mockPlayer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          inputProps: expect.objectContaining({
            segments: expect.arrayContaining([
              expect.objectContaining({ clipId: "clip-2" }),
              expect.objectContaining({ clipId: "clip-1" })
            ])
          })
        })
      )
    );
  });

  it("supports undo and redo for resize changes", async () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    const undoButton = screen.getByRole("button", {
      name: "Undo timeline change"
    });
    const redoButton = screen.getByRole("button", {
      name: "Redo timeline change"
    });

    fireEvent.mouseDown(screen.getByTestId("timeline-resize-strip-clip-1-0"), {
      clientX: 100
    });
    fireEvent.mouseMove(window, { clientX: 220 });
    fireEvent.mouseUp(window);

    expect(undoButton).toBeEnabled();

    fireEvent.click(undoButton);

    await waitFor(() =>
      expect(mockPlayer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          inputProps: expect.objectContaining({
            segments: expect.arrayContaining([
              expect.objectContaining({
                clipId: "clip-1",
                durationSeconds: 2.5
              })
            ])
          })
        })
      )
    );

    expect(redoButton).toBeEnabled();

    fireEvent.click(redoButton);

    await waitFor(() =>
      expect(mockPlayer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          inputProps: expect.objectContaining({
            segments: expect.arrayContaining([
              expect.objectContaining({
                clipId: "clip-1",
                durationSeconds: 4
              })
            ])
          })
        })
      )
    );
  });

  it("deletes a clip from the timeline and supports undo", async () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    fireEvent.click(screen.getByTestId("timeline-delete-clip-1-0"));

    await waitFor(() =>
      expect(mockPlayer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          inputProps: expect.objectContaining({
            segments: [
              expect.objectContaining({
                clipId: "clip-2"
              })
            ]
          })
        })
      )
    );

    expect(screen.getByTestId("timeline-total-duration")).toHaveTextContent(
      "5s"
    );
    expect(
      screen.getByRole("button", { name: "Add clip to timeline" })
    ).toBeEnabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Undo timeline change" })
    );

    await waitFor(() =>
      expect(mockPlayer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          inputProps: expect.objectContaining({
            segments: expect.arrayContaining([
              expect.objectContaining({ clipId: "clip-1" }),
              expect.objectContaining({ clipId: "clip-2" })
            ])
          })
        })
      )
    );

    expect(screen.getByTestId("timeline-total-duration")).toHaveTextContent(
      "7.5s"
    );
  });

  it("adds a deleted clip back to the end of the timeline and supports undo", async () => {
    const user = userEvent.setup();

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    fireEvent.click(screen.getByTestId("timeline-delete-clip-1-0"));
    await waitFor(() =>
      expect(screen.getByTestId("timeline-total-duration")).toHaveTextContent(
        "5s"
      )
    );

    await user.click(screen.getByRole("button", { name: "Add clip to timeline" }));
    mockSeekTo.mockClear();
    await user.click(screen.getByRole("button", { name: /kitchen/i }));

    await waitFor(() => expect(mockSeekTo).toHaveBeenCalledWith(225));

    await waitFor(() =>
      expect(mockPlayer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          inputProps: expect.objectContaining({
            segments: expect.arrayContaining([
              expect.objectContaining({ clipId: "clip-2" }),
              expect.objectContaining({ clipId: "clip-1" })
            ])
          })
        })
      )
    );

    expect(screen.getByTestId("timeline-total-duration")).toHaveTextContent(
      "7.5s"
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Undo timeline change" })
    );

    await waitFor(() =>
      expect(screen.getByTestId("timeline-total-duration")).toHaveTextContent(
        "5s"
      )
    );
  });

  it("shows user media in the add-clip popover and appends it to the timeline", async () => {
    const user = userEvent.setup();

    mockUseUserMediaReelPickerInfinite.mockReturnValue({
      items: [
        {
          id: "user-media:media-1",
          reelClipSource: "user_media",
          videoUrl: "https://user-media/video.mp4",
          thumbnail: "https://user-media/thumb.jpg",
          alt: "Uploaded walkthrough",
          durationSeconds: 3
        } as ContentItem
      ],
      errorMessage: null,
      isInitialLoading: false,
      isLoadingMore: false,
      loadMoreRef: jest.fn(),
      retry: jest.fn()
    });

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={1}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    await user.click(screen.getByRole("button", { name: "Add clip to timeline" }));
    await user.click(screen.getByRole("button", { name: "User Media" }));
    mockSeekTo.mockClear();
    await user.click(screen.getByRole("button", { name: /Uploaded walkthrough/i }));

    await waitFor(() => expect(mockSeekTo).toHaveBeenCalledWith(315));

    await waitFor(() =>
      expect(mockPlayer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          inputProps: expect.objectContaining({
            segments: expect.arrayContaining([
              expect.objectContaining({
                clipId: "user-media:media-1",
                textOverlay: expect.objectContaining({
                  text: "Original hook"
                })
              })
            ])
          })
        })
      )
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /Add Uploaded walkthrough/i })
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByText("No user media videos available.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Upload videos here" })
    ).toHaveAttribute("href", "/media");

    fireEvent.click(
      screen.getByTestId("timeline-delete-user-media:media-1-2")
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Add Uploaded walkthrough/i })
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByText("No user media videos available.")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Upload videos here" })
    ).not.toBeInTheDocument();
  });

  it("resizes a clip from the right edge, updates the player input, and caps at the max duration", async () => {
    const user = userEvent.setup();

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    fireEvent.mouseDown(screen.getByTestId("timeline-resize-strip-clip-1-0"), {
      clientX: 100
    });
    fireEvent.mouseMove(window, { clientX: 220 });
    fireEvent.mouseUp(window);

    await waitFor(() =>
      expect(mockPlayer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          inputProps: expect.objectContaining({
            segments: expect.arrayContaining([
              expect.objectContaining({
                clipId: "clip-1",
                durationSeconds: 4
              })
            ])
          })
        })
      )
    );

    await user.click(screen.getByTestId("reel-preview-save"));

    expect(mockOnSave).toHaveBeenCalledWith({
      hook: "Original hook",
      caption: "Original caption",
      overlayBackground: "black",
      overlayPosition: "center",
      overlayFontPairing: "contemporary-script",
      showAddress: false,
      orderedClipIds: ["clip-1", "clip-2"],
      clipDurationOverrides: { "clip-1": 4, "clip-2": 5 },
      sequence: [
        {
          sourceType: "listing_clip",
          sourceId: "clip-1",
          durationSeconds: 4
        },
        {
          sourceType: "listing_clip",
          sourceId: "clip-2",
          durationSeconds: 5
        }
      ],
      saveTarget: {
        contentSource: "cached_create",
        cacheKeyTimestamp: 123,
        cacheKeyId: 4,
        subcategory: "new_listing",
        mediaType: "video"
      }
    });
  });

  it("saves using the saved-content target when editing a persisted reel", async () => {
    const user = userEvent.setup();

    render(
      <VideoPreviewModal
        selectedPreview={{
          ...createSelectedPreview(),
          captionItem: {
            ...createSelectedPreview().captionItem,
            id: "saved-saved-reel-1",
            savedContentId: "saved-reel-1",
            contentSource: "saved_content"
          } as ContentItem,
          captionItemKey: {
            contentSource: "saved_content",
            savedContentId: "saved-reel-1"
          }
        }}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    await user.clear(screen.getByLabelText("Header"));
    await user.type(screen.getByLabelText("Header"), "Saved reel updated");
    await user.click(screen.getByTestId("reel-preview-save"));

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        overlayBackground: "black",
        overlayPosition: "center",
        overlayFontPairing: "contemporary-script",
        showAddress: false,
        saveTarget: {
          contentSource: "saved_content",
          savedContentId: "saved-reel-1"
        }
      })
    );
  });

  it("treats the hover drag strip as the right-side resize surface", async () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    fireEvent.mouseDown(screen.getByTestId("timeline-resize-strip-clip-1-0"), {
      clientX: 100
    });
    fireEvent.mouseMove(window, { clientX: 156 });
    fireEvent.mouseUp(window);

    await waitFor(() =>
      expect(mockPlayer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          inputProps: expect.objectContaining({
            segments: expect.arrayContaining([
              expect.objectContaining({
                clipId: "clip-1",
                durationSeconds: 3.38
              })
            ])
          })
        })
      )
    );
  });

  it("syncs the red playhead from player frame updates and seeks the player from ruler clicks", async () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    const ruler = screen.getByTestId("timeline-ruler");
    Object.defineProperty(ruler, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 300 } as DOMRect)
    });

    act(() => {
      emitPlayerEvent("frameupdate", { frame: 45 });
    });

    await waitFor(() =>
      expect(screen.getByTestId("timeline-playhead")).toHaveAttribute(
        "data-current-frame",
        "45"
      )
    );

    fireEvent.mouseDown(ruler, { clientX: 150 });

    expect(mockPause).toHaveBeenCalled();
    expect(mockSeekTo).toHaveBeenCalled();
  });

  it("allows scrubbing from the playhead line, not just the top pin", async () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    fireEvent.mouseDown(screen.getByTestId("timeline-playhead-line-hitbox"), {
      clientX: 120
    });
    fireEvent.mouseMove(window, { clientX: 180 });
    fireEvent.mouseUp(window);

    expect(mockPause).toHaveBeenCalled();
    expect(mockSeekTo).toHaveBeenCalled();
  });

  it("preserves the current frame when clip duration changes", async () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    act(() => {
      emitPlayerEvent("frameupdate", { frame: 40 });
    });

    fireEvent.mouseDown(screen.getByTestId("timeline-resize-strip-clip-1-0"), {
      clientX: 100
    });
    fireEvent.mouseMove(window, { clientX: 160 });
    fireEvent.mouseUp(window);

    await waitFor(() => expect(mockSeekTo).toHaveBeenCalledWith(40));
  });

  it("allows clips to shrink down to a 0.5 second minimum", async () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    fireEvent.mouseDown(screen.getByTestId("timeline-resize-strip-clip-1-0"), {
      clientX: 200
    });
    fireEvent.mouseMove(window, { clientX: -200 });
    fireEvent.mouseUp(window);

    await waitFor(() =>
      expect(mockPlayer).toHaveBeenLastCalledWith(
        expect.objectContaining({
          inputProps: expect.objectContaining({
            segments: expect.arrayContaining([
              expect.objectContaining({
                clipId: "clip-1",
                durationSeconds: 0.5
              })
            ])
          })
        })
      )
    );
  });

  it("rebinds player frame listeners when the modal closes and reopens", async () => {
    const preview = createSelectedPreview();
    const { rerender } = render(
      <VideoPreviewModal
        selectedPreview={preview}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    const initialAddCount = mockAddEventListener.mock.calls.length;
    const initialRemoveCount = mockRemoveEventListener.mock.calls.length;

    rerender(
      <VideoPreviewModal
        selectedPreview={null}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    expect(mockRemoveEventListener.mock.calls.length).toBeGreaterThan(
      initialRemoveCount
    );

    rerender(
      <VideoPreviewModal
        selectedPreview={preview}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    await waitFor(() =>
      expect(mockAddEventListener.mock.calls.length).toBeGreaterThan(
        initialAddCount
      )
    );

    act(() => {
      emitPlayerEvent("frameupdate", { frame: 30 });
    });

    await waitFor(() =>
      expect(screen.getByTestId("timeline-playhead")).toHaveAttribute(
        "data-current-frame",
        "30"
      )
    );
  });

  it("syncs the playhead immediately from the autoplaying player frame", async () => {
    jest.useFakeTimers();
    const requestAnimationFrameSpy = jest
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback) =>
        window.setTimeout(() => callback(performance.now()), 16)
      );
    const cancelAnimationFrameSpy = jest
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation((id: number) => window.clearTimeout(id));

    mockCurrentFrame = 18;

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    act(() => {
      jest.advanceTimersByTime(20);
    });

    await waitFor(() =>
      expect(screen.getByTestId("timeline-playhead")).toHaveAttribute(
        "data-current-frame",
        "18"
      )
    );

    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
    jest.useRealTimers();
  });

  it("does not rerender the player when only the playhead frame changes", async () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    mockPlayer.mockClear();

    act(() => {
      emitPlayerEvent("frameupdate", { frame: 24 });
    });

    await waitFor(() =>
      expect(screen.getByTestId("timeline-playhead")).toHaveAttribute(
        "data-current-frame",
        "24"
      )
    );

    expect(mockPlayer).not.toHaveBeenCalled();
  });

  it("starts autoplay sync for a newly selected reel preview", async () => {
    jest.useFakeTimers();
    const requestAnimationFrameSpy = jest
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback) =>
        window.setTimeout(() => callback(performance.now()), 16)
      );
    const cancelAnimationFrameSpy = jest
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation((id: number) => window.clearTimeout(id));

    const { rerender } = render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreviewWithId("preview-1")}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    rerender(
      <VideoPreviewModal
        selectedPreview={null}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    mockCurrentFrame = 14;

    rerender(
      <VideoPreviewModal
        selectedPreview={createSelectedPreviewWithId("preview-2")}
        userMediaVideoCount={0}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    act(() => {
      jest.advanceTimersByTime(20);
    });

    await waitFor(() =>
      expect(screen.getByTestId("timeline-playhead")).toHaveAttribute(
        "data-current-frame",
        "14"
      )
    );

    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
    jest.useRealTimers();
  });
});
