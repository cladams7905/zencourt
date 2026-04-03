import type * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanImageWorkspace } from "@web/src/components/listings/stage/plan/subcomponents/PlanImageWorkspace";
import {
  UNCATEGORIZED_CATEGORY_ID,
  categoryUsedDropZoneId
} from "@web/src/components/listings/stage/plan/shared";
import { useScrollFade } from "@web/src/components/shared/hooks/useScrollFade";

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

jest.mock("@web/src/components/shared/hooks/useScrollFade", () => ({
  useScrollFade: jest.fn()
}));

const noopDragLeave = () => {};

const kitchenUsed = {
  id: "used-1",
  url: "/used.jpg",
  filename: "used.jpg",
  category: "kitchen",
  recommendationScore: 0.9,
  workspacePlacement: "used" as const
};

const kitchenDock = {
  id: "dock-1",
  url: "/dock.jpg",
  filename: "dock.jpg",
  category: "kitchen",
  recommendationScore: 0.5,
  workspacePlacement: "dock" as const
};

describe("PlanImageWorkspace", () => {
  beforeEach(() => {
    (useScrollFade as jest.Mock).mockReturnValue({
      containerRef: { current: null },
      maskImage: "linear-gradient(to right, black calc(100% - 24px), transparent)"
    });
  });

  it("renders room accordions with video picks only", () => {
    render(
      <PlanImageWorkspace
        images={[kitchenUsed, kitchenDock]}
        accordionCategoryOrder={["kitchen"]}
        usedImagesByCategory={{ kitchen: [kitchenUsed] }}
        baseCategoryCounts={{ kitchen: 1 }}
        usedImageCount={1}
        maxUsedImagesTotal={10}
        hasOverUsedLimit={false}
        dragOverCategory={null}
        onOpenCreateCategory={jest.fn()}
        onDeleteCategory={jest.fn()}
        onCategoryUsedDragOver={jest.fn()}
        onCategoryRowDragLeave={noopDragLeave}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        onSceneMotionChange={jest.fn()}
        handleDropOnCategoryUsed={() => jest.fn()}
      />
    );

    expect(screen.getByText("Kitchen")).toBeInTheDocument();
    expect(screen.queryByText(/Quick unused dock/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Recommended for video")).not.toBeInTheDocument();
    expect(screen.getByText("Add Room")).toBeInTheDocument();
    expect(screen.getAllByAltText("used.jpg").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByAltText("dock.jpg")).not.toBeInTheDocument();
    expect(screen.getByText("1/10 videos")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /camera motion for used\.jpg/i })
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("category-scroll-container-kitchen").getAttribute("style")
    ).toContain("mask-image");
  });

  it("does not render an uncategorized accordion when no photos are used for video", () => {
    const uncat = {
      id: "u1",
      url: "/u.jpg",
      filename: "u.jpg",
      category: null,
      recommendationScore: 0.2,
      workspacePlacement: "dock" as const
    };
    render(
      <PlanImageWorkspace
        images={[uncat]}
        accordionCategoryOrder={[]}
        usedImagesByCategory={{ [UNCATEGORIZED_CATEGORY_ID]: [] }}
        baseCategoryCounts={{}}
        usedImageCount={0}
        maxUsedImagesTotal={10}
        hasOverUsedLimit={false}
        dragOverCategory={null}
        onOpenCreateCategory={jest.fn()}
        onDeleteCategory={jest.fn()}
        onCategoryUsedDragOver={jest.fn()}
        onCategoryRowDragLeave={noopDragLeave}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        onSceneMotionChange={jest.fn()}
        handleDropOnCategoryUsed={() => jest.fn()}
      />
    );

    expect(screen.queryByText("Uncategorized")).not.toBeInTheDocument();
    expect(screen.getByText("Add Room")).toBeInTheDocument();
  });

  it("shows over-limit warning state in the summary chips", () => {
    render(
      <PlanImageWorkspace
        images={[
          {
            id: "dock-2",
            url: "/dock-2.jpg",
            filename: "dock-2.jpg",
            category: null,
            recommendationScore: 0.2,
            workspacePlacement: "dock",
            isUncategorized: true
          }
        ]}
        accordionCategoryOrder={[]}
        usedImagesByCategory={{}}
        baseCategoryCounts={{}}
        usedImageCount={11}
        maxUsedImagesTotal={10}
        hasOverUsedLimit
        dragOverCategory={null}
        onOpenCreateCategory={jest.fn()}
        onDeleteCategory={jest.fn()}
        onCategoryUsedDragOver={jest.fn()}
        onCategoryRowDragLeave={noopDragLeave}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        onSceneMotionChange={jest.fn()}
        handleDropOnCategoryUsed={() => jest.fn()}
      />
    );

    expect(screen.getByText("11/10 videos")).toBeInTheDocument();
    expect(
      screen.queryByText(/room over the video limit/i)
    ).not.toBeInTheDocument();
  });

  it("renders empty room accordions with zero scenes", () => {
    const onDeleteCategory = jest.fn();
    render(
      <PlanImageWorkspace
        images={[
          {
            id: "dock-3",
            url: "/dock-3.jpg",
            filename: "dock-3.jpg",
            category: null,
            recommendationScore: 0.2,
            workspacePlacement: "dock"
          }
        ]}
        accordionCategoryOrder={["kitchen"]}
        usedImagesByCategory={{}}
        baseCategoryCounts={{ kitchen: 1 }}
        usedImageCount={0}
        maxUsedImagesTotal={10}
        hasOverUsedLimit={false}
        dragOverCategory={null}
        onOpenCreateCategory={jest.fn()}
        onDeleteCategory={onDeleteCategory}
        onCategoryUsedDragOver={jest.fn()}
        onCategoryRowDragLeave={noopDragLeave}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        onSceneMotionChange={jest.fn()}
        handleDropOnCategoryUsed={() => jest.fn()}
      />
    );

    expect(screen.getByText("Kitchen")).toBeInTheDocument();
    expect(screen.getByText("0 scenes")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /delete kitchen/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/drag an image here to use as a video starting frame/i)
    ).toBeInTheDocument();
  });

  it("shows the delete button for every room category", async () => {
    const onDeleteCategory = jest.fn();
    const user = userEvent.setup();

    render(
      <PlanImageWorkspace
        images={[kitchenUsed, kitchenDock]}
        accordionCategoryOrder={["kitchen", "bedroom"]}
        usedImagesByCategory={{ kitchen: [kitchenUsed] }}
        baseCategoryCounts={{ kitchen: 1, bedroom: 1 }}
        usedImageCount={1}
        maxUsedImagesTotal={10}
        hasOverUsedLimit={false}
        dragOverCategory={null}
        onOpenCreateCategory={jest.fn()}
        onDeleteCategory={onDeleteCategory}
        onCategoryUsedDragOver={jest.fn()}
        onCategoryRowDragLeave={noopDragLeave}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        onSceneMotionChange={jest.fn()}
        handleDropOnCategoryUsed={() => jest.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: /delete kitchen/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /delete bedroom/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /delete bedroom/i }));

    expect(onDeleteCategory).toHaveBeenCalledWith("bedroom");
  });

  it("shows a tooltip on the delete button", async () => {
    const user = userEvent.setup();

    render(
      <PlanImageWorkspace
        images={[kitchenUsed]}
        accordionCategoryOrder={["kitchen"]}
        usedImagesByCategory={{ kitchen: [kitchenUsed] }}
        baseCategoryCounts={{ kitchen: 1 }}
        usedImageCount={1}
        maxUsedImagesTotal={10}
        hasOverUsedLimit={false}
        dragOverCategory={null}
        onOpenCreateCategory={jest.fn()}
        onDeleteCategory={jest.fn()}
        onCategoryUsedDragOver={jest.fn()}
        onCategoryRowDragLeave={noopDragLeave}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        onSceneMotionChange={jest.fn()}
        handleDropOnCategoryUsed={() => jest.fn()}
      />
    );

    await user.hover(screen.getByRole("button", { name: /delete kitchen/i }));

    expect(screen.getByRole("tooltip", { name: "Delete room" })).toBeInTheDocument();
  });

  it("opens a newly added room accordion by default", async () => {
    const { rerender } = render(
      <PlanImageWorkspace
        images={[kitchenUsed]}
        accordionCategoryOrder={["kitchen"]}
        usedImagesByCategory={{ kitchen: [kitchenUsed] }}
        baseCategoryCounts={{ kitchen: 1 }}
        usedImageCount={1}
        maxUsedImagesTotal={10}
        hasOverUsedLimit={false}
        dragOverCategory={null}
        onOpenCreateCategory={jest.fn()}
        onDeleteCategory={jest.fn()}
        onCategoryUsedDragOver={jest.fn()}
        onCategoryRowDragLeave={noopDragLeave}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        onSceneMotionChange={jest.fn()}
        handleDropOnCategoryUsed={() => jest.fn()}
      />
    );

    rerender(
      <PlanImageWorkspace
        images={[
          kitchenUsed,
          {
            id: "bedroom-dock",
            url: "/bedroom.jpg",
            filename: "bedroom.jpg",
            category: "bedroom",
            recommendationScore: 0.2,
            workspacePlacement: "dock"
          }
        ]}
        accordionCategoryOrder={["kitchen", "bedroom"]}
        usedImagesByCategory={{ kitchen: [kitchenUsed] }}
        baseCategoryCounts={{ kitchen: 1, bedroom: 1 }}
        usedImageCount={1}
        maxUsedImagesTotal={10}
        hasOverUsedLimit={false}
        dragOverCategory={null}
        onOpenCreateCategory={jest.fn()}
        onDeleteCategory={jest.fn()}
        onCategoryUsedDragOver={jest.fn()}
        onCategoryRowDragLeave={noopDragLeave}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        onSceneMotionChange={jest.fn()}
        handleDropOnCategoryUsed={() => jest.fn()}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/drag an image here to use as a video starting frame/i)
      ).toBeInTheDocument();
    });
  });

  it("opens a closed room accordion when dragging over it", async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <PlanImageWorkspace
        images={[
          {
            id: "bedroom-dock",
            url: "/bedroom.jpg",
            filename: "bedroom.jpg",
            category: "bedroom",
            recommendationScore: 0.2,
            workspacePlacement: "dock"
          }
        ]}
        accordionCategoryOrder={["bedroom"]}
        usedImagesByCategory={{}}
        baseCategoryCounts={{ bedroom: 1 }}
        usedImageCount={0}
        maxUsedImagesTotal={10}
        hasOverUsedLimit={false}
        dragOverCategory={null}
        onOpenCreateCategory={jest.fn()}
        onDeleteCategory={jest.fn()}
        onCategoryUsedDragOver={jest.fn()}
        onCategoryRowDragLeave={noopDragLeave}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        onSceneMotionChange={jest.fn()}
        handleDropOnCategoryUsed={() => jest.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /toggle bedroom/i }));
    expect(
      screen.queryByText(/drag an image here to use as a video starting frame/i)
    ).not.toBeInTheDocument();

    rerender(
      <PlanImageWorkspace
        images={[
          {
            id: "bedroom-dock",
            url: "/bedroom.jpg",
            filename: "bedroom.jpg",
            category: "bedroom",
            recommendationScore: 0.2,
            workspacePlacement: "dock"
          }
        ]}
        accordionCategoryOrder={["bedroom"]}
        usedImagesByCategory={{}}
        baseCategoryCounts={{ bedroom: 1 }}
        usedImageCount={0}
        maxUsedImagesTotal={10}
        hasOverUsedLimit={false}
        dragOverCategory={categoryUsedDropZoneId("bedroom")}
        onOpenCreateCategory={jest.fn()}
        onDeleteCategory={jest.fn()}
        onCategoryUsedDragOver={jest.fn()}
        onCategoryRowDragLeave={noopDragLeave}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        onSceneMotionChange={jest.fn()}
        handleDropOnCategoryUsed={() => jest.fn()}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/drag an image here to use as a video starting frame/i)
      ).toBeInTheDocument();
    });
  });
});
