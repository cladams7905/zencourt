import type * as React from "react";
import { render, screen } from "@testing-library/react";
import { CategorizeImageWorkspace } from "@web/src/components/listings/stage/categorize/subcomponents/CategorizeImageWorkspace";
import { UNCATEGORIZED_CATEGORY_ID } from "@web/src/components/listings/stage/categorize/shared";

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

describe("CategorizeImageWorkspace", () => {
  it("renders room accordions and quick unused dock", () => {
    render(
      <CategorizeImageWorkspace
        images={[kitchenUsed, kitchenDock]}
        workspaceCategoryOrder={["kitchen"]}
        usedImagesByCategory={{ kitchen: [kitchenUsed] }}
        dockedImagesByCategory={{ kitchen: [kitchenDock] }}
        dockedImagesCount={1}
        baseCategoryCounts={{ kitchen: 1 }}
        usedImageCount={1}
        maxUsedImagesTotal={12}
        hasOverUsedLimit={false}
        categoriesOverUsedLimit={[]}
        dragOverCategory={null}
        openImageMenuId={null}
        onOpenCreateCategory={jest.fn()}
        onCategoryUsedDragOver={jest.fn()}
        onCategoryUnusedDragOver={jest.fn()}
        onCategoryRowDragLeave={noopDragLeave}
        onGlobalUnusedDockDragOver={jest.fn()}
        onGlobalUnusedDockDragLeave={noopDragLeave}
        onOpenImageMenuChange={jest.fn()}
        onRequestMoveImage={jest.fn()}
        onRequestDeleteImage={jest.fn()}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        handleDropOnCategoryUsed={() => jest.fn()}
        handleDropOnCategoryUnusedStrip={() => jest.fn()}
        handleGlobalUnusedDockDrop={jest.fn()}
      />
    );

    expect(screen.getByText("Kitchen")).toBeInTheDocument();
    expect(screen.getByText(/Quick unused dock/i)).toBeInTheDocument();
    expect(screen.queryByText("Recommended for video")).not.toBeInTheDocument();
    expect(screen.getByText("Add Category")).toBeInTheDocument();
    expect(screen.getAllByAltText("used.jpg").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByAltText("dock.jpg").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1/12 used photos")).toBeInTheDocument();
  });

  it("shows uncategorized label for needs-categorization bucket", () => {
    const uncat = {
      id: "u1",
      url: "/u.jpg",
      filename: "u.jpg",
      category: null,
      recommendationScore: 0.2,
      workspacePlacement: "dock" as const
    };
    render(
      <CategorizeImageWorkspace
        images={[uncat]}
        workspaceCategoryOrder={[UNCATEGORIZED_CATEGORY_ID]}
        usedImagesByCategory={{ [UNCATEGORIZED_CATEGORY_ID]: [] }}
        dockedImagesByCategory={{ [UNCATEGORIZED_CATEGORY_ID]: [uncat] }}
        dockedImagesCount={1}
        baseCategoryCounts={{}}
        usedImageCount={0}
        maxUsedImagesTotal={12}
        hasOverUsedLimit={false}
        categoriesOverUsedLimit={[]}
        dragOverCategory={null}
        openImageMenuId={null}
        onOpenCreateCategory={jest.fn()}
        onCategoryUsedDragOver={jest.fn()}
        onCategoryUnusedDragOver={jest.fn()}
        onCategoryRowDragLeave={noopDragLeave}
        onGlobalUnusedDockDragOver={jest.fn()}
        onGlobalUnusedDockDragLeave={noopDragLeave}
        onOpenImageMenuChange={jest.fn()}
        onRequestMoveImage={jest.fn()}
        onRequestDeleteImage={jest.fn()}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        handleDropOnCategoryUsed={() => jest.fn()}
        handleDropOnCategoryUnusedStrip={() => jest.fn()}
        handleGlobalUnusedDockDrop={jest.fn()}
      />
    );

    expect(screen.getByText("Uncategorized")).toBeInTheDocument();
  });

  it("shows over-limit warning state in the summary chips", () => {
    render(
      <CategorizeImageWorkspace
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
        workspaceCategoryOrder={[UNCATEGORIZED_CATEGORY_ID]}
        usedImagesByCategory={{}}
        dockedImagesByCategory={{
          [UNCATEGORIZED_CATEGORY_ID]: [
            {
              id: "dock-2",
              url: "/dock-2.jpg",
              filename: "dock-2.jpg",
              category: null,
              recommendationScore: 0.2,
              workspacePlacement: "dock",
              isUncategorized: true
            }
          ]
        }}
        dockedImagesCount={1}
        baseCategoryCounts={{}}
        usedImageCount={13}
        maxUsedImagesTotal={12}
        hasOverUsedLimit
        categoriesOverUsedLimit={["kitchen"]}
        dragOverCategory={null}
        openImageMenuId={null}
        onOpenCreateCategory={jest.fn()}
        onCategoryUsedDragOver={jest.fn()}
        onCategoryUnusedDragOver={jest.fn()}
        onCategoryRowDragLeave={noopDragLeave}
        onGlobalUnusedDockDragOver={jest.fn()}
        onGlobalUnusedDockDragLeave={noopDragLeave}
        onOpenImageMenuChange={jest.fn()}
        onRequestMoveImage={jest.fn()}
        onRequestDeleteImage={jest.fn()}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        handleDropOnCategoryUsed={() => jest.fn()}
        handleDropOnCategoryUnusedStrip={() => jest.fn()}
        handleGlobalUnusedDockDrop={jest.fn()}
      />
    );

    expect(
      screen.getByText("1 room over the used-photo limit")
    ).toBeInTheDocument();
    expect(screen.getByText("13/12 used photos")).toBeInTheDocument();
  });
});
