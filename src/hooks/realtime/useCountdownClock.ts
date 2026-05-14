import { useEffect, useMemo, useState } from "react";

export const useCountdownClock = (countdownEndsAt: number | null, countdownSeconds: number) => {
  const [remainingMs, setRemainingMs] = useState(0);
  const [countdownStartedAt, setCountdownStartedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!countdownEndsAt) {
      setRemainingMs(0);
      setCountdownStartedAt(null);
      return;
    }

    setCountdownStartedAt(Date.now());
    setRemainingMs(Math.max(0, countdownEndsAt - Date.now()));
    let raf = 0;
    let lastUpdate = 0;
    
    const render = (now: number) => {
      // Throttle React state updates to ~15fps (every 66ms) instead of 60fps (16ms)
      // This drastically reduces re-renders of ContestantPage and reduces lag
      if (now - lastUpdate > 66) {
         setRemainingMs(Math.max(0, countdownEndsAt - Date.now()));
         lastUpdate = now;
      }
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [countdownEndsAt]);

  const shouldKeepInitialSecond =
    countdownEndsAt != null &&
    countdownSeconds > 0 &&
    countdownStartedAt != null &&
    Date.now() - countdownStartedAt < 1000;
  const remainingSeconds = shouldKeepInitialSecond ? countdownSeconds : Math.ceil(remainingMs / 1000);
  const progress = useMemo(() => {
    if (!countdownSeconds) return 0;
    const pct = (remainingMs / (countdownSeconds * 1000)) * 100;
    return Math.min(100, Math.max(0, pct));
  }, [countdownSeconds, remainingMs]);

  return { remainingMs, remainingSeconds, progress };
};
