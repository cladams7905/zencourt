import * as React from "react";
import {
  DEFAULT_GENERATED_STATE,
  SESSION_STORAGE_KEY,
  type GeneratedContentState
} from "@web/src/components/dashboard/shared";
import {
  parseGeneratedContentSession,
  serializeGeneratedContentSession
} from "@web/src/components/dashboard/domain/dashboardSessionUtils";

export function useDashboardSessionCache() {
  const [generatedContentItems, setGeneratedContentItems] =
    React.useState<GeneratedContentState>(DEFAULT_GENERATED_STATE);

  React.useEffect(() => {
    const rawValue = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const parsed = parseGeneratedContentSession(rawValue);

    if (parsed) {
      setGeneratedContentItems(parsed);
      return;
    }

    if (rawValue) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  React.useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        serializeGeneratedContentSession(generatedContentItems)
      );
    } catch {
      // Ignore storage errors (quota/disabled storage)
    }
  }, [generatedContentItems]);

  return {
    generatedContentItems,
    setGeneratedContentItems
  };
}
