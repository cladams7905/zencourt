import * as React from "react";
import { render, screen } from "@testing-library/react";

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

import { ListingClipManagerClipList } from "@web/src/components/listings/content/clipManager/subcomponents/ListingClipManagerClipList";
import type { ListingClipVersionItem } from "@web/src/components/listings/content/shared/types";

describe("ListingClipManagerClipList", () => {
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
        prompt: "Forward pan through the Kitchen.",
        durationSeconds: 4,
        versionNumber: 1,
        versionStatus: "completed",
        generatedAt: "2026-03-19T12:30:00.000Z"
      },
      versions: []
    }
  ] as never;

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
});
