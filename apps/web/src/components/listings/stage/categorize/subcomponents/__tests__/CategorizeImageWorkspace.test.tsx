import type * as React from "react";
import { render, screen } from "@testing-library/react";
import { CategorizeImageWorkspace } from "@web/src/components/listings/stage/categorize/subcomponents/CategorizeImageWorkspace";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    fill: _fill,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} />
  )
}));

describe("CategorizeImageWorkspace", () => {
  it("renders used images in accordions and docked images in the unused dock", async () => {
    render(
      <CategorizeImageWorkspace
        images={[
          {
            id: "used-1",
            url: "/used.jpg",
            filename: "used.jpg",
            category: "kitchen",
            recommendationScore: 0.9,
            workspacePlacement: "used"
          },
          {
            id: "dock-1",
            url: "/dock.jpg",
            filename: "dock.jpg",
            category: "kitchen",
            recommendationScore: 0.5,
            workspacePlacement: "dock"
          }
        ]}
        categoryOrder={["kitchen"]}
        usedImagesByCategory={{
          kitchen: [
            {
              id: "used-1",
              url: "/used.jpg",
              filename: "used.jpg",
              category: "kitchen",
              recommendationScore: 0.9,
              workspacePlacement: "used"
            }
          ]
        }}
        dockedImages={[
          {
            id: "dock-1",
            url: "/dock.jpg",
            filename: "dock.jpg",
            category: "kitchen",
            recommendationScore: 0.5,
            workspacePlacement: "dock"
          }
        ]}
        categoryUsageCounts={{ kitchen: 1 }}
        baseCategoryCounts={{ kitchen: 1 }}
        usedImageCount={1}
        maxUsedImagesTotal={12}
        uncategorizedDockCount={0}
        hasOverUsedLimit={false}
        categoriesOverUsedLimit={[]}
        openCategories={["kitchen"]}
        dragOverCategory={null}
        openImageMenuId={null}
        onOpenUpload={jest.fn()}
        onOpenCreateCategory={jest.fn()}
        onOpenCategoriesChange={jest.fn()}
        onCategoryDragOver={jest.fn()}
        onCategoryDragLeave={jest.fn()}
        onDockDragOver={jest.fn()}
        onDockDragLeave={jest.fn()}
        onOpenImageMenuChange={jest.fn()}
        onEditCategory={jest.fn()}
        onDeleteCategory={jest.fn()}
        onRequestMoveImage={jest.fn()}
        onRequestDeleteImage={jest.fn()}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        handleDrop={() => jest.fn()}
        handleDockDrop={jest.fn()}
      />
    );

    expect(screen.getByText("Unused Photos")).toBeInTheDocument();
    expect(screen.getByAltText("used.jpg")).toBeInTheDocument();
    expect(screen.getByText("dock.jpg")).toBeInTheDocument();
    expect(screen.getByText("1/12 used photos")).toBeInTheDocument();
  });

  it("shows over-limit warning state in the dock header", () => {
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
        categoryOrder={["kitchen"]}
        usedImagesByCategory={{}}
        dockedImages={[
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
        categoryUsageCounts={{ kitchen: 4 }}
        baseCategoryCounts={{}}
        usedImageCount={13}
        maxUsedImagesTotal={12}
        uncategorizedDockCount={2}
        hasOverUsedLimit
        categoriesOverUsedLimit={["kitchen"]}
        openCategories={[]}
        dragOverCategory={null}
        openImageMenuId={null}
        onOpenUpload={jest.fn()}
        onOpenCreateCategory={jest.fn()}
        onOpenCategoriesChange={jest.fn()}
        onCategoryDragOver={jest.fn()}
        onCategoryDragLeave={jest.fn()}
        onDockDragOver={jest.fn()}
        onDockDragLeave={jest.fn()}
        onOpenImageMenuChange={jest.fn()}
        onEditCategory={jest.fn()}
        onDeleteCategory={jest.fn()}
        onRequestMoveImage={jest.fn()}
        onRequestDeleteImage={jest.fn()}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        handleDrop={() => jest.fn()}
        handleDockDrop={jest.fn()}
      />
    );

    expect(screen.getByText("1 room over the used-photo limit")).toBeInTheDocument();
    expect(screen.getByText("13/12 used photos")).toBeInTheDocument();
  });
});
