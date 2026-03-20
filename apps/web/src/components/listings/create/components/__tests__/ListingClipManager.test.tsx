import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseSWR = jest.fn();
const mockUseSearchParams = jest.fn();

jest.mock("swr", () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseSWR(...args)
}));

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockUseSearchParams()
}));

jest.mock("@web/src/server/actions/video/generate", () => ({
  regenerateListingClipVersion: jest.fn()
}));

jest.mock("@web/src/components/ui/loading-image", () => ({
  LoadingImage: ({ fill: _fill, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...(props as React.ComponentProps<"img">)}
      alt={(props.alt as string) ?? ""}
    />
  )
}));

import { ListingClipManager } from "@web/src/components/listings/create/components/ListingClipManager";
import type { ListingClipVersionItem } from "@web/src/components/listings/create/shared/types";
import { regenerateListingClipVersion } from "@web/src/server/actions/video/generate";

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
          versionNumber: 1,
          versionStatus: "completed",
          generatedAt: "2026-03-19T12:30:00.000Z"
        }
      ]
    }
  ] as never;

  beforeEach(() => {
    jest.clearAllMocks();
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

  it("shows an always-visible download control for the selected clip and opens its video url", async () => {
    const user = userEvent.setup();
    const openSpy = jest
      .spyOn(window, "open")
      .mockImplementation(() => null);

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

    expect(openSpy).toHaveBeenCalledWith(
      "https://video",
      "_blank",
      "noopener,noreferrer"
    );

    openSpy.mockRestore();
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

  it("shows loading spinners and disables regenerate for the selected clip while regeneration is in progress", () => {
    const processingItems: ListingClipVersionItem[] = [
      {
        ...items[0],
        currentVersion: {
          ...items[0].currentVersion,
          versionStatus: "processing",
          durationSeconds: 4
        },
        versions: [
          {
            ...items[0].versions[0],
            versionStatus: "processing",
            durationSeconds: 4
          }
        ]
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
    expect(screen.queryByText("4s")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^regenerate$/i })).toBeDisabled();
  });
});
