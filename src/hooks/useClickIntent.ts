import { useEffect, useRef } from "react";

// Disambiguates a single click from a double click on the same element so a
// row/card can use single-click = select and double-click = open (1.9).
// A pending single-click fires after `delay`; a double-click cancels it.
export function useClickIntent(handlers: {
  onSingle: () => void;
  onDouble: () => void;
  delay?: number;
}) {
  const timer = useRef<number | null>(null);
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    },
    [],
  );

  return {
    onClick() {
      if (timer.current != null) return; // a double-click may still be coming
      timer.current = window.setTimeout(() => {
        timer.current = null;
        latest.current.onSingle();
      }, latest.current.delay ?? 220);
    },
    onDoubleClick() {
      if (timer.current != null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      latest.current.onDouble();
    },
  };
}
