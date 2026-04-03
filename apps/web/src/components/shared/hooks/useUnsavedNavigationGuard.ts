import * as React from "react";

type UseUnsavedNavigationGuardParams = {
  enabled: boolean;
  message: string;
};

export function useUnsavedNavigationGuard({
  enabled,
  message
}: UseUnsavedNavigationGuardParams) {
  const confirmNavigation = React.useCallback(
    (navigate: () => void) => {
      if (!enabled || window.confirm(message)) {
        navigate();
      }
    },
    [enabled, message]
  );

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor || anchor.getAttribute("data-ignore-unsaved") === "true") {
        return;
      }
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }
      const nextHref = anchor.href;
      const currentHref = window.location.href;
      if (
        !nextHref.startsWith(window.location.origin) ||
        nextHref === currentHref
      ) {
        return;
      }

      if (!window.confirm(message)) {
        event.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [enabled, message]);

  return {
    confirmNavigation
  };
}
