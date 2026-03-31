"use client";

import * as React from "react";
import { FileEdit } from "lucide-react";
import { ViewHeader } from "@web/src/components/view/ViewHeader";
import { Badge } from "@web/src/components/ui/badge";
import { useListingStageViewContext } from "@web/src/components/listings/stage/shared/ListingStageViewContext";

type ListingStageViewHeaderProps = {
  action?: React.ReactNode;
  subtitle?: string;
};

export const ListingStageViewHeader = React.forwardRef<
  HTMLElement,
  ListingStageViewHeaderProps
>(function ListingStageViewHeader({ action, subtitle }, ref) {
  const context = useListingStageViewContext();

  const showDraftBadge =
    context.listingView && context.listingDbStage !== "complete";

  const titleAddon = showDraftBadge ? (
    <Badge
      variant="muted"
      className="gap-1.5 rounded-full px-2 text-sm font-normal text-muted-foreground"
    >
      <FileEdit className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
      Draft
    </Badge>
  ) : undefined;

  return (
    <ViewHeader
      ref={ref}
      title={context.title}
      subtitle={subtitle ?? context.subtitle}
      titleAddon={titleAddon}
      listingView={context.listingView}
      hideCreateButton={context.hideCreateButton}
      action={action}
    />
  );
});
