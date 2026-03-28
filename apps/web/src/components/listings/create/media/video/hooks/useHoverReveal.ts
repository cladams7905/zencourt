import * as React from "react";

export function useHoverReveal(options?: {
  revealDelayMs?: number;
  hideDelayMs?: number;
}) {
  const revealDelayMs = options?.revealDelayMs ?? 120;
  const hideDelayMs = options?.hideDelayMs ?? 200;

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [revealedId, setRevealedId] = React.useState<string | null>(null);
  const timerRef = React.useRef<number | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleEnter = React.useCallback(
    (id: string) => {
      clearTimer();
      setActiveId(id);
      setRevealedId(null);
      timerRef.current = window.setTimeout(() => {
        setRevealedId(id);
        timerRef.current = null;
      }, revealDelayMs);
    },
    [clearTimer, revealDelayMs]
  );

  const handleLeave = React.useCallback(() => {
    clearTimer();
    setRevealedId(null);
    timerRef.current = window.setTimeout(() => {
      setActiveId(null);
      timerRef.current = null;
    }, hideDelayMs);
  }, [clearTimer, hideDelayMs]);

  React.useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return {
    activeId,
    revealedId,
    handleEnter,
    handleLeave
  };
}
