import {
  TableCell,
  TableRow
} from "@web/src/components/ui/table";

export const ListingSkeletonRow = () => (
  <TableRow className="h-16">
    <TableCell className="py-4">
      <div className="h-4 w-40 rounded-sm bg-muted-foreground/10" />
    </TableCell>
    <TableCell className="py-4">
      <div className="h-4 w-20 rounded-sm bg-muted-foreground/10" />
    </TableCell>
    <TableCell className="py-4">
      <div className="flex items-center gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`skeleton-image-${index}`}
            className="h-10 w-10 rounded-md bg-muted-foreground/10"
          />
        ))}
      </div>
    </TableCell>
    <TableCell className="py-4">
      <div className="h-4 w-16 rounded-sm bg-muted-foreground/10" />
    </TableCell>
  </TableRow>
);
