import type * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanUnusedDock } from "@web/src/components/listings/stage/plan/subcomponents/PlanUnusedDock";
import { UNUSED_DOCK_DROP_ZONE_ID } from "@web/src/components/listings/stage/plan/shared";

jest.mock("next/image", () => ({
  __esModule: true,
  default: (
    props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }
  ) => {
    const { fill, ...rest } = props;
    void fill;
    return (
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- Next image stub; alt comes from props
      <img {...rest} />
    );
  }
}));

const dockImage = {
  id: "dock-1",
  url: "/dock.jpg",
  filename: "dock.jpg",
  category: "kitchen",
  recommendationScore: 0.5,
  workspacePlacement: "dock" as const
};

describe("PlanUnusedDock", () => {
  it("renders the unused dock collapsed by default when images are docked", () => {
    render(
      <PlanUnusedDock
        dockedImages={[dockImage]}
        dragOverCategory={null}
        onGlobalUnusedDockDragOver={jest.fn()}
        onGlobalUnusedDockDragLeave={jest.fn()}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        handleGlobalUnusedDockDrop={jest.fn()}
      />
    );

    expect(screen.getByText("Unused photos")).toBeInTheDocument();
    expect(
      screen.getByText("1 photos will not be used in any videos")
    ).toBeInTheDocument();
    expect(screen.queryByAltText("dock.jpg")).not.toBeInTheDocument();
  });

  it("shows zero count in the trigger when there are no docked images", async () => {
    const user = userEvent.setup();
    render(
      <PlanUnusedDock
        dockedImages={[]}
        dragOverCategory={null}
        onGlobalUnusedDockDragOver={jest.fn()}
        onGlobalUnusedDockDragLeave={jest.fn()}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        handleGlobalUnusedDockDrop={jest.fn()}
      />
    );

    expect(screen.getByText("0")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Unused photos/i }));
    expect(
      screen.getByText("Drag photos here to remove them as a video starting frame.")
    ).toBeInTheDocument();
  });

  it("stays collapsed by default on desktop", () => {
    render(
      <PlanUnusedDock
        dockedImages={[]}
        dragOverCategory={null}
        onGlobalUnusedDockDragOver={jest.fn()}
        onGlobalUnusedDockDragLeave={jest.fn()}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        handleGlobalUnusedDockDrop={jest.fn()}
      />
    );

    expect(
      screen.queryByText("Drag photos here to remove them as a video starting frame.")
    ).not.toBeInTheDocument();
  });

  it("opens the unused dock when dragging over it while closed", async () => {
    const { rerender } = render(
      <PlanUnusedDock
        dockedImages={[dockImage]}
        dragOverCategory={null}
        onGlobalUnusedDockDragOver={jest.fn()}
        onGlobalUnusedDockDragLeave={jest.fn()}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        handleGlobalUnusedDockDrop={jest.fn()}
      />
    );

    expect(
      screen.queryByAltText("dock.jpg")
    ).not.toBeInTheDocument();

    rerender(
      <PlanUnusedDock
        dockedImages={[dockImage]}
        dragOverCategory={UNUSED_DOCK_DROP_ZONE_ID}
        onGlobalUnusedDockDragOver={jest.fn()}
        onGlobalUnusedDockDragLeave={jest.fn()}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        handleGlobalUnusedDockDrop={jest.fn()}
      />
    );

    expect(
      screen.getByAltText("dock.jpg")
    ).toBeInTheDocument();
  });
});
