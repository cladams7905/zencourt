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
  it("renders room accordions with video picks only", () => {
    render(
      <CategorizeImageWorkspace
        images={[kitchenUsed, kitchenDock]}
        accordionCategoryOrder={["kitchen"]}
        usedImagesByCategory={{ kitchen: [kitchenUsed] }}
        baseCategoryCounts={{ kitchen: 1 }}
        usedImageCount={1}
        maxUsedImagesTotal={12}
        hasOverUsedLimit={false}
        categoriesOverUsedLimit={[]}
        dragOverCategory={null}
        onOpenCreateCategory={jest.fn()}
        onCategoryUsedDragOver={jest.fn()}
        onCategoryRowDragLeave={noopDragLeave}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        handleDropOnCategoryUsed={() => jest.fn()}
      />
    );

    expect(screen.getByText("Kitchen")).toBeInTheDocument();
    expect(screen.queryByText(/Quick unused dock/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Recommended for video")).not.toBeInTheDocument();
    expect(screen.getByText("Add Room")).toBeInTheDocument();
    expect(screen.getAllByAltText("used.jpg").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByAltText("dock.jpg")).not.toBeInTheDocument();
    expect(screen.getByText("1/12 videos")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /photo options/i })
    ).not.toBeInTheDocument();
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
      <CategorizeImageWorkspace
        images={[uncat]}
        accordionCategoryOrder={[]}
        usedImagesByCategory={{ [UNCATEGORIZED_CATEGORY_ID]: [] }}
        baseCategoryCounts={{}}
        usedImageCount={0}
        maxUsedImagesTotal={12}
        hasOverUsedLimit={false}
        categoriesOverUsedLimit={[]}
        dragOverCategory={null}
        onOpenCreateCategory={jest.fn()}
        onCategoryUsedDragOver={jest.fn()}
        onCategoryRowDragLeave={noopDragLeave}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        handleDropOnCategoryUsed={() => jest.fn()}
      />
    );

    expect(screen.queryByText("Uncategorized")).not.toBeInTheDocument();
    expect(screen.getByText("Add Room")).toBeInTheDocument();
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
        accordionCategoryOrder={[]}
        usedImagesByCategory={{}}
        baseCategoryCounts={{}}
        usedImageCount={13}
        maxUsedImagesTotal={12}
        hasOverUsedLimit
        categoriesOverUsedLimit={["kitchen"]}
        dragOverCategory={null}
        onOpenCreateCategory={jest.fn()}
        onCategoryUsedDragOver={jest.fn()}
        onCategoryRowDragLeave={noopDragLeave}
        handleDragStart={() => jest.fn()}
        handleDragEnd={jest.fn()}
        handleDropOnCategoryUsed={() => jest.fn()}
      />
    );

    expect(
      screen.getByText("1 room over the video limit")
    ).toBeInTheDocument();
    expect(screen.getByText("13/12 videos")).toBeInTheDocument();
  });
});
