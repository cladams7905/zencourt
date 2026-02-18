import {
  ChevronDown,
  Upload
} from "lucide-react";
import type { UserMediaType } from "@shared/types/models";
import type { MediaUsageSort } from "@web/src/components/media/shared";
import { Badge } from "@web/src/components/ui/badge";
import { Button } from "@web/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@web/src/components/ui/dropdown-menu";

interface MediaToolbarProps {
  totalImages: number;
  totalVideos: number;
  selectedTypes: UserMediaType[];
  usageSort: MediaUsageSort;
  onUploadClick: () => void;
  onTypeToggle: (type: UserMediaType, checked: boolean) => void;
  onUsageSortChange: (value: MediaUsageSort) => void;
}

export const MediaToolbar = ({
  totalImages,
  totalVideos,
  selectedTypes,
  usageSort,
  onUploadClick,
  onTypeToggle,
  onUsageSortChange
}: MediaToolbarProps) => {
  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      <Button variant="default" className="gap-2" onClick={onUploadClick}>
        <Upload className="h-4 w-4" />
        Upload media
      </Button>
      <div className="flex w-full items-center justify-end gap-3 sm:ml-auto sm:w-auto">
        <Badge variant="secondary" className="text-xs px-2 py-1">
          {totalImages} images • {totalVideos} videos
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              Filter
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Type</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={selectedTypes.includes("image")}
              onCheckedChange={(checked) => onTypeToggle("image", checked === true)}
            >
              Images
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={selectedTypes.includes("video")}
              onCheckedChange={(checked) => onTypeToggle("video", checked === true)}
            >
              Videos
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Usage</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={usageSort}
              onValueChange={(value) => onUsageSortChange(value as MediaUsageSort)}
            >
              <DropdownMenuRadioItem value="none">Any usage</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="most-used">Most used</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="least-used">Least used</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
