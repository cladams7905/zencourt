import { FileEdit } from "lucide-react";
import { Badge } from "@web/src/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@web/src/components/ui/tooltip";
import { TableCell, TableRow } from "@web/src/components/ui/table";
import { ListingImageStack } from "@web/src/components/listings/myListings/components/ListingImageStack";
import {
  MAX_LISTING_IMAGES,
  type ListingRowViewModel
} from "@web/src/components/listings/myListings/shared";

type ListingRowProps = {
  row: ListingRowViewModel;
  onOpen: (path: string) => void;
};

export const ListingRow = ({ row, onOpen }: ListingRowProps) => {
  return (
    <TableRow
      className="group h-16 cursor-pointer transition-colors hover:bg-secondary/60"
      onClick={() => onOpen(row.path)}
    >
      <TableCell className="py-4 font-medium">
        <div className="flex items-center gap-2">
          <span className="text-foreground">{row.title}</span>
          {row.showDraftBadge ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="muted" className="rounded-full py-1 px-1">
                  <FileEdit className="text-muted-foreground w-[14px]! h-[14px]!" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>
                {row.draftTooltipLabel}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="py-4 text-sm text-muted-foreground">
        {row.lastOpenedLabel}
      </TableCell>
      <TableCell className="py-4">
        <ListingImageStack
          listingId={row.id}
          previewImages={row.previewImages}
          remainingCount={row.remainingCount}
          imageCount={row.imageCount}
          maxListingImages={MAX_LISTING_IMAGES}
        />
      </TableCell>
      <TableCell className="py-4 text-sm text-muted-foreground">
        {row.stageLabel}
      </TableCell>
    </TableRow>
  );
};
