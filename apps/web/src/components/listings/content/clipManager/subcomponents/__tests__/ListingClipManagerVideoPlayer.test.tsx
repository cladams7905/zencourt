import { render, screen } from "@testing-library/react";
import { ListingClipManagerVideoPlayer } from "@web/src/components/listings/content/clipManager/subcomponents/ListingClipManagerVideoPlayer";

describe("ListingClipManagerVideoPlayer", () => {
  it("renders the preview viewport with cover video styling", () => {
    const { container } = render(
      <ListingClipManagerVideoPlayer
        videoUrl="https://video"
        posterUrl="https://thumb"
      />
    );

    expect(screen.getByTestId("clip-preview-viewport")).toHaveClass(
      "aspect-9/16"
    );
    expect(container.querySelector("video")).toHaveClass("object-cover");
  });
});
