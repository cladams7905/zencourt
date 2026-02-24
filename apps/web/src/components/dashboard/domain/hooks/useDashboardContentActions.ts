import * as React from "react";
import type {
  DashboardContentCategory,
  DashboardContentType,
  GeneratedContentState
} from "@web/src/components/dashboard/shared";
import { toggleFavoriteAcrossGenerated } from "@web/src/components/dashboard/domain/dashboardContentMappers";

type UseDashboardContentActionsParams = {
  contentType: DashboardContentType;
  activeCategory: DashboardContentCategory | null;
  setGeneratedContentItems: React.Dispatch<React.SetStateAction<GeneratedContentState>>;
};

export function useDashboardContentActions({
  contentType,
  activeCategory,
  setGeneratedContentItems
}: UseDashboardContentActionsParams) {
  const handleFavoriteToggle = React.useCallback(
    (id: string) => {
      setGeneratedContentItems((prev) => toggleFavoriteAcrossGenerated(prev, id));
    },
    [setGeneratedContentItems]
  );

  const handleDeleteGeneratedItem = React.useCallback(
    (id: string) => {
      if (!activeCategory) {
        return;
      }

      setGeneratedContentItems((prev) => {
        const currentItems = prev[contentType]?.[activeCategory] ?? [];
        const nextItems = currentItems.filter((item) => item.id !== id);

        return {
          ...prev,
          [contentType]: {
            ...prev[contentType],
            [activeCategory]: nextItems
          }
        };
      });
    },
    [activeCategory, contentType, setGeneratedContentItems]
  );

  return {
    handleFavoriteToggle,
    handleDeleteGeneratedItem
  };
}
