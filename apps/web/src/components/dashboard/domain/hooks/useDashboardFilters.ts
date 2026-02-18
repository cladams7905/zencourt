import * as React from "react";
import {
  CATEGORY_LABEL_MAP,
  DEFAULT_ACTIVE_FILTER,
  type DashboardContentType,
  type DashboardFilterLabel
} from "@web/src/components/dashboard/shared";

export function useDashboardFilters() {
  const [contentType, setContentType] =
    React.useState<DashboardContentType>("videos");
  const [activeFilters, setActiveFilters] = React.useState<DashboardFilterLabel[]>([
    DEFAULT_ACTIVE_FILTER
  ]);
  const [hasSelectedFilter, setHasSelectedFilter] = React.useState(false);

  const handleFilterToggle = React.useCallback((filter: DashboardFilterLabel) => {
    setActiveFilters([filter]);
    setHasSelectedFilter(true);
  }, []);

  const handleTypeChange = React.useCallback((type: DashboardContentType) => {
    setContentType(type);
    setHasSelectedFilter(true);
  }, []);

  const activeFilter =
    activeFilters[0] ?? DEFAULT_ACTIVE_FILTER;
  const activeCategory = CATEGORY_LABEL_MAP[activeFilter];

  return {
    contentType,
    activeFilters,
    activeFilter,
    activeCategory,
    hasSelectedFilter,
    handleFilterToggle,
    handleTypeChange
  };
}
