import * as React from "react";
import type { UserMediaType } from "@shared/types/models";
import type { MediaUsageSort } from "@web/src/components/media/shared";

export const useMediaFilters = () => {
  const [selectedTypes, setSelectedTypes] = React.useState<UserMediaType[]>([
    "image",
    "video"
  ]);
  const [usageSort, setUsageSort] = React.useState<MediaUsageSort>("none");

  const handleTypeToggle = React.useCallback(
    (type: UserMediaType, checked: boolean) => {
      setSelectedTypes((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(type);
        } else {
          next.delete(type);
        }
        return Array.from(next);
      });
    },
    []
  );

  return {
    selectedTypes,
    usageSort,
    setUsageSort,
    handleTypeToggle
  };
};
