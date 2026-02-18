import * as React from "react";
import type { SettingsTabId } from "@web/src/components/settings/shared";
import { SETTINGS_HASH_TO_TAB } from "@web/src/components/settings/shared";

export const useSettingsNavigation = () => {
  const [activeTab, setActiveTab] = React.useState<SettingsTabId>("account");
  const [pendingHash, setPendingHash] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncFromHash = () => {
      const hash = window.location.hash;
      if (!hash) {
        return;
      }

      setPendingHash(hash);
      const nextTab = SETTINGS_HASH_TO_TAB[hash];
      if (nextTab) {
        setActiveTab(nextTab);
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  React.useEffect(() => {
    if (!pendingHash) {
      return;
    }

    window.requestAnimationFrame(() => {
      const targetId = pendingHash.replace("#", "");
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setPendingHash(null);
    });
  }, [activeTab, pendingHash]);

  return {
    activeTab,
    setActiveTab
  };
};
