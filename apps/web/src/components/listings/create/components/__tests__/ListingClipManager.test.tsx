import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseSWR = jest.fn();
const mockUseSearchParams = jest.fn();
const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
const mockMatchMedia = jest.fn();

jest.mock("swr", () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseSWR(...args)
}));

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockUseSearchParams()
}));

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args)
  }
}));

jest.mock("@web/src/server/actions/video/generate", () => ({
  regenerateListingClipVersion: jest.fn(),
  cancelVideoGenerationBatch: jest.fn()
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

import { ListingClipManager } from "@web/src/components/listings/create/components/ListingClipManager";
import type { ListingClipVersionItem } from "@web/src/components/listings/create/shared/types";
import {
  cancelVideoGenerationBatch,
  regenerateListingClipVersion
} from "@web/src/server/actions/video/generate";

describe("ListingClipManager", () => {
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
      versions: [
        {
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
        }
      ]
    }
  ] as never;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: mockMatchMedia.mockImplementation(() => ({
        matches: true,
        media: "(min-width: 1024px)",
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    });
    mockUseSWR.mockReturnValue({ data: undefined });
    mockUseSearchParams.mockReturnValue({
      toString: () => "mediaType=videos&filter=property_features&page=2"
    });
  });

  it("links the summary card to the child clips route and preserves query state", () => {
    render(<ListingClipManager listingId="listing-1" items={items} />);

    const link = screen.getByRole("link", { name: /view generated clips/i });

    expect(link).toHaveAttribute(
      "href",
      "/listings/listing-1/create/clips?mediaType=videos&filter=property_features&page=2"
    );
    expect(screen.getByText("1 clips")).toBeInTheDocument();
  });

  it("renders the inline workspace when requested", () => {
    render(
      <ListingClipManager
        listingId="listing-1"
        items={items}
        mode="workspace"
      />
    );

    expect(screen.getAllByText("Kitchen").length).toBeGreaterThan(0);
    expect(screen.getByText("Version")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^regenerate$/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /view generated clips/i })
    ).not.toBeInTheDocument();
  });

  it("renders the selected clip details inline on mobile instead of the desktop detail pane", () => {
    mockMatchMedia.mockImplementation(() => ({
      matches: false,
      media: "(min-width: 1024px)",
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn()
    }));

    render(
      <ListingClipManager
        listingId="listing-1"
        items={items}
        mode="workspace"
      />
    );

    expect(screen.getByTestId("mobile-clip-detail-clip-1")).toBeInTheDocument();
    expect(screen.queryByTestId("desktop-clip-detail")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("mobile-clip-detail-clip-1")
    ).toHaveTextContent("Version");
  });

  it("opens regenerate options on click and expands customization in the popup", async () => {
    const user = userEvent.setup();

    render(
      <ListingClipManager
        listingId="listing-1"
        items={items}
        mode="workspace"
      />
    );

    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));

    expect(await screen.findByText("Quick regenerate")).toBeInTheDocument();
    expect(await screen.findByText("Customize prompt")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /customize prompt/i }));

    expect(await screen.findByLabelText("AI Directions")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /Regenerate/i }).length
    ).toBeGreaterThan(0);
  });

  it("lets the user type custom ai directions for a clip regeneration", async () => {
    const user = userEvent.setup();

    render(
      <ListingClipManager
        listingId="listing-1"
        items={items}
        mode="workspace"
      />
    );

    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));
    await user.click(screen.getByRole("button", { name: /customize prompt/i }));

    const textarea = await screen.findByLabelText("AI Directions");
    await user.clear(textarea);
    await user.type(textarea, "Brighter kitchen, cleaner counters");

    expect(textarea).toHaveValue("Brighter kitchen, cleaner counters");
  });

  it("shows an always-visible download control for the selected clip and downloads its video file", async () => {
    const user = userEvent.setup();
    const anchorClick = jest.fn();
    const createElementSpy = jest
      .spyOn(document, "createElement")
      .mockImplementation((tagName: string) => {
        const element = document.createElementNS(
          "http://www.w3.org/1999/xhtml",
          tagName
        ) as HTMLElement;

        if (tagName === "a") {
          Object.defineProperty(element, "click", {
            value: anchorClick
          });
        }

        return element;
      });

    render(
      <ListingClipManager
        listingId="listing-1"
        items={items}
        mode="workspace"
      />
    );

    const downloadButton = screen.getByRole("button", {
      name: /download clip/i
    });

    expect(downloadButton).toBeInTheDocument();
    expect(downloadButton.className).not.toMatch(/opacity-0/);

    await user.click(downloadButton);

    const anchor = createElementSpy.mock.results.find(
      (result) => result.value instanceof HTMLAnchorElement
    )?.value as HTMLAnchorElement | undefined;
    expect(anchor?.href).toContain(
      "/api/v1/listings/listing-1/clip-versions/clip-version-1/download"
    );
    expect(anchorClick).toHaveBeenCalled();

    createElementSpy.mockRestore();
  });

  it("quick regenerate sends the clip id instead of the clip version id", async () => {
    const user = userEvent.setup();
    const mockRegenerateListingClipVersion = jest.mocked(
      regenerateListingClipVersion
    );
    mockRegenerateListingClipVersion.mockResolvedValue({
      listingId: "listing-1",
      clipId: "clip-1",
      clipVersionId: "clip-version-2",
      batchId: "batch-1"
    });

    render(
      <ListingClipManager
        listingId="listing-1"
        items={items}
        mode="workspace"
      />
    );

    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));
    await user.click(screen.getByRole("button", { name: /quick regenerate/i }));

    expect(mockRegenerateListingClipVersion).toHaveBeenCalledWith({
      listingId: "listing-1",
      clipId: "clip-1",
      aiDirections: "Warm light"
    });
  });

  it("replaces regenerate with cancel after quick regenerate starts", async () => {
    const user = userEvent.setup();
    jest.mocked(regenerateListingClipVersion).mockResolvedValue({
      listingId: "listing-1",
      clipId: "clip-1",
      clipVersionId: "clip-version-2",
      batchId: "batch-1"
    });

    render(
      <ListingClipManager
        listingId="listing-1"
        items={items}
        mode="workspace"
      />
    );

    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));
    await user.click(screen.getByRole("button", { name: /quick regenerate/i }));

    expect(
      await screen.findByRole("button", { name: /cancel generation/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^regenerate$/i })
    ).not.toBeInTheDocument();
  });

  it("falls back to the last successful thumbnail and duration after a regeneration fails", () => {
    const failedItems: ListingClipVersionItem[] = [
      {
        ...items[0],
        inFlightVersion: {
          ...items[0].currentVersion,
          clipVersionId: "clip-version-2",
          thumbnail: undefined,
          videoUrl: undefined,
          aiDirections: "new directions",
          versionNumber: 2,
          versionStatus: "failed",
          generatedAt: "2026-03-20T10:00:00.000Z",
          durationSeconds: undefined
        }
      }
    ] as never;

    render(
      <ListingClipManager
        listingId="listing-1"
        items={failedItems}
        mode="workspace"
      />
    );

    expect(screen.getByAltText("Kitchen")).toHaveAttribute("src", "https://thumb");
    expect(screen.getAllByText("4s")).toHaveLength(2);
    expect(
      screen.queryAllByLabelText(/clip regeneration in progress/i)
    ).toHaveLength(0);
  });

  it("confirms cancel and calls cancelVideoGenerationBatch for the active clip batch", async () => {
    const user = userEvent.setup();
    jest.mocked(regenerateListingClipVersion).mockResolvedValue({
      listingId: "listing-1",
      clipId: "clip-1",
      clipVersionId: "clip-version-2",
      batchId: "batch-1"
    });
    jest.mocked(cancelVideoGenerationBatch).mockResolvedValue({
      success: true,
      batchId: "batch-1",
      canceledBatches: 1,
      canceledJobs: 1
    });

    render(
      <ListingClipManager
        listingId="listing-1"
        items={items}
        mode="workspace"
      />
    );

    await user.click(screen.getByRole("button", { name: /^regenerate$/i }));
    await user.click(screen.getByRole("button", { name: /quick regenerate/i }));
    await user.click(
      await screen.findByRole("button", { name: /cancel generation/i })
    );

    expect(
      await screen.findByRole("heading", { name: /cancel clip generation\?/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^cancel generation$/i }));

    expect(cancelVideoGenerationBatch).toHaveBeenCalledWith(
      "batch-1",
      "Canceled by user"
    );
  });

  it("shows loading spinners and disables regenerate for the selected clip while regeneration is in progress", () => {
    const processingItems: ListingClipVersionItem[] = [
      {
        ...items[0],
        currentVersion: {
          ...items[0].currentVersion,
          clipVersionId: "clip-version-2",
          versionStatus: "processing",
          durationSeconds: undefined,
          thumbnail: undefined,
          videoUrl: undefined
        }
      }
    ] as never;

    render(
      <ListingClipManager
        listingId="listing-1"
        items={processingItems}
        mode="workspace"
      />
    );

    expect(
      screen.getAllByLabelText(/clip regeneration in progress/i)
    ).toHaveLength(2);
    expect(screen.getByText("Regenerating")).toBeInTheDocument();
    expect(screen.getByText("4s")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^regenerate$/i })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /cancel generation/i })
    ).not.toBeInTheDocument();
  });

  it("keeps showing the latest successful thumbnail while regeneration is in progress", () => {
    const processingItems: ListingClipVersionItem[] = [
      {
        ...items[0],
        currentVersion: {
          ...items[0].currentVersion,
          clipVersionId: "clip-version-2",
          thumbnail: undefined,
          videoUrl: undefined,
          versionStatus: "processing"
        }
      }
    ] as never;

    render(
      <ListingClipManager
        listingId="listing-1"
        items={processingItems}
        mode="workspace"
      />
    );

    expect(screen.getByAltText("Kitchen")).toHaveAttribute("src", "https://thumb");
  });

  it("keeps polling and shows a delayed-generation toast when clip regeneration exceeds the soft timeout", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-20T10:11:00.000Z"));

    const processingItems: ListingClipVersionItem[] = [
      {
        ...items[0],
        currentVersion: {
          ...items[0].currentVersion,
          clipVersionId: "clip-version-2",
          versionStatus: "processing",
          generatedAt: "2026-03-20T10:00:00.000Z"
        }
      }
    ] as never;

    render(
      <ListingClipManager
        listingId="listing-1"
        items={processingItems}
        mode="workspace"
      />
    );

    expect(mockToastError).toHaveBeenCalledWith(
      "Generation is taking longer than usual because the queue is busy. We'll keep trying."
    );
    const lastCall = mockUseSWR.mock.calls.at(-1);
    expect(lastCall?.[2]).toMatchObject({ refreshInterval: 2000 });

    jest.useRealTimers();
  });
});
