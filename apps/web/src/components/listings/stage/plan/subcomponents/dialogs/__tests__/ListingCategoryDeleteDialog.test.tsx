import { render, screen } from "@testing-library/react";
import { ListingCategoryDeleteDialog } from "@web/src/components/listings/stage/plan/subcomponents/dialogs/ListingCategoryDeleteDialog";

describe("ListingCategoryDeleteDialog", () => {
  it('describes that images will move to "Unused photos"', () => {
    render(
      <ListingCategoryDeleteDialog
        open
        categoryLabel="Kitchen"
        onOpenChange={jest.fn()}
        onConfirm={jest.fn()}
      />
    );

    expect(
      screen.getByText(
        'Delete "Kitchen"? All images in this room will be moved to "Unused photos".'
      )
    ).toBeInTheDocument();
  });
});
