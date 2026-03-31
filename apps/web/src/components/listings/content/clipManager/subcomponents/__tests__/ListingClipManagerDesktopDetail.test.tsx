import { render, screen } from "@testing-library/react";
import { ListingClipManagerDesktopDetail } from "@web/src/components/listings/content/clipManager/subcomponents/ListingClipManagerDesktopDetail";
import { ListingClipManagerVideoPlayer } from "@web/src/components/listings/content/clipManager/subcomponents/ListingClipManagerVideoPlayer";

describe("ListingClipManagerDesktopDetail", () => {
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
});
