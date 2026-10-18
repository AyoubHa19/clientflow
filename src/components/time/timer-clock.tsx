"use client";

import { useSyncExternalStore } from "react";
import { formatClock } from "@/lib/time";

// One clock for every timer on the page: the current second, ticking.
function subscribe(onTick: () => void) {
  const timer = setInterval(onTick, 1000);
  return () => clearInterval(timer);
}
const currentSecond = () => Math.floor(Date.now() / 1000);
// The server (and the first render in the browser) shows no time yet: its
// clock and the browser's differ.
const noSecond = () => null;

/**
 * A running timer's clock, ticking every second. It isn't announced each
 * second: the label around it says what's running.
 */
export function TimerClock({ startedAt, className }: { startedAt: string; className?: string }) {
  const now = useSyncExternalStore(subscribe, currentSecond, noSecond);
  return (
    <span aria-hidden className={className}>
      {now === null ? "0:00:00" : formatClock(now - Date.parse(startedAt) / 1000)}
    </span>
  );
}
