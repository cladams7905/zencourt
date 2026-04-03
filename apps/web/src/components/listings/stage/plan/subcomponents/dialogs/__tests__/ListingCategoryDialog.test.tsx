import { render, screen } from "@testing-library/react";
import { ListingCategoryDialog } from "@web/src/components/listings/stage/plan/subcomponents/dialogs/ListingCategoryDialog";

describe("ListingCategoryDialog", () => {
  it("uses space terminology in add mode", () => {
    render(
      <ListingCategoryDialog
        open
        mode="add"
        onOpenChange={jest.fn()}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.getByText("Add a space")).toBeInTheDocument();
    expect(
      screen.getByText("Add a new property space to your video plan.")
    ).toBeInTheDocument();
    expect(screen.getByText("Space")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveTextContent("Select a space");
  });
});
