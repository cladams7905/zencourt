import * as React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import type { PlayablePreview } from "@web/src/components/listings/create/shared/types";
import { VideoPreviewModal } from "@web/src/components/listings/create/media/video/components/VideoPreviewModal";

const mockPlayer = jest.fn<React.ReactNode, [unknown]>(
  () => <div data-testid="video-player" />
);
const mockOnOpenChange = jest.fn();
const mockOnSave = jest.fn();
const mockSeekTo = jest.fn();
const mockPause = jest.fn();
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
let mockCurrentFrame = 0;
const playerListeners = new Map<string, Set<(event: { detail: unknown }) => void>>();

function emitPlayerEvent(name: string, detail: unknown) {
  const listeners = playerListeners.get(name);
  listeners?.forEach((listener) => listener({ detail }));
}

jest.mock("@remotion/player", () => ({
  Player: React.forwardRef((props: unknown, ref: React.ForwardedRef<unknown>) => {
    React.useImperativeHandle(ref, () => ({
      seekTo: mockSeekTo,
      pause: mockPause,
      getCurrentFrame: () => mockCurrentFrame,
      addEventListener: (name: string, callback: (event: { detail: unknown }) => void) => {
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
  })
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
        durationSeconds: 2.5,
        maxDurationSeconds: 4
      },
      {
        clipId: "clip-2",
        src: "https://video/2.mp4",
        thumbnailSrc: "https://img/2.jpg",
        category: "exterior",
        durationSeconds: 5,
        maxDurationSeconds: 6
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

describe("VideoPreviewModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    playerListeners.clear();
    mockCurrentFrame = 0;
    mockOnSave.mockResolvedValue(undefined);
  });

  it("renders a player, timeline items, and editable hook/caption fields", () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
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
    expect(
      screen.getByRole("button", { name: "Undo timeline change" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Redo timeline change" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Add clip to timeline" })
    ).toBeDisabled();
    expect(screen.getByText("2/2")).toBeInTheDocument();
  });

  it("keeps the player shell above a minimum desktop size", () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    expect(screen.getByTestId("video-player-shell").className).toContain("max-w-[320px]");
    expect(screen.getByTestId("video-player-shell").className).toContain("xl:h-[86%]");
  });

  it("enables save when fields change and resets draft values on cancel", async () => {
    const user = userEvent.setup();

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
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
      orderedClipIds: ["clip-1", "clip-2"],
      clipDurationOverrides: { "clip-1": 2.5, "clip-2": 5 },
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

  it("reorders timeline clips, updates the player input, and saves the new clip order", async () => {
    const user = userEvent.setup();

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
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

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockOnSave).toHaveBeenCalledWith({
      hook: "Original hook",
      caption: "Original caption",
      orderedClipIds: ["clip-2", "clip-1"],
      clipDurationOverrides: { "clip-2": 5, "clip-1": 2.5 },
      captionItemKey: {
        cacheKeyTimestamp: 123,
        cacheKeyId: 4,
        mediaType: "video"
      }
    });
  });

  it("shows a grab cursor on the card body for reorder interactions", () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
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

    expect(screen.getByText("1/2")).toBeInTheDocument();
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

    expect(screen.getByText("2/2")).toBeInTheDocument();
  });

  it("adds a deleted clip back to the end of the timeline and supports undo", async () => {
    const user = userEvent.setup();

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    fireEvent.click(screen.getByTestId("timeline-delete-clip-1-0"));
    await waitFor(() => expect(screen.getByText("1/2")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Add clip to timeline" }));
    await user.click(screen.getByRole("button", { name: /kitchen/i }));

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

    expect(screen.getByText("2/2")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Undo timeline change" })
    );

    await waitFor(() => expect(screen.getByText("1/2")).toBeInTheDocument());
  });

  it("resizes a clip from the right edge, updates the player input, and caps at the max duration", async () => {
    const user = userEvent.setup();

    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
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

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockOnSave).toHaveBeenCalledWith({
      hook: "Original hook",
      caption: "Original caption",
      orderedClipIds: ["clip-1", "clip-2"],
      clipDurationOverrides: { "clip-1": 4, "clip-2": 5 },
      captionItemKey: {
        cacheKeyTimestamp: 123,
        cacheKeyId: 4,
        mediaType: "video"
      }
    });
  });

  it("treats the hover drag strip as the right-side resize surface", async () => {
    render(
      <VideoPreviewModal
        selectedPreview={createSelectedPreview()}
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
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    rerender(
      <VideoPreviewModal
        selectedPreview={null}
        previewFps={30}
        onOpenChange={mockOnOpenChange}
        onSavePreviewText={mockOnSave}
      />
    );

    mockCurrentFrame = 14;

    rerender(
      <VideoPreviewModal
        selectedPreview={createSelectedPreviewWithId("preview-2")}
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
