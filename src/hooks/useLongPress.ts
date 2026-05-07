import { useCallback, useRef } from "react";

// Returns event handlers to attach to a touchable element. After holdMs of
// continuous touch, `onLongPress` fires with the original touch event. A
// follow-up click is suppressed once the long-press has fired so the
// underlying <Link> doesn't navigate.
export function useLongPress<T>(
  onLongPress: (e: React.TouchEvent<T>) => void,
  holdMs = 500,
) {
  const timer = useRef<number | null>(null);
  const triggered = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent<T>) => {
      triggered.current = false;
      cancel();
      timer.current = window.setTimeout(() => {
        triggered.current = true;
        onLongPress(e);
      }, holdMs);
    },
    [cancel, holdMs, onLongPress],
  );

  const onTouchEnd = useCallback(() => {
    cancel();
  }, [cancel]);

  const onTouchMove = useCallback(() => {
    cancel();
  }, [cancel]);

  const onClick = useCallback((e: React.MouseEvent<T>) => {
    if (triggered.current) {
      e.preventDefault();
      e.stopPropagation();
      triggered.current = false;
    }
  }, []);

  return { onTouchStart, onTouchEnd, onTouchMove, onTouchCancel: onTouchEnd, onClick };
}
