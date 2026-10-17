"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * False on the server and in the first render, true once React runs in the
 * browser. Forms that only work with JavaScript keep their submit button
 * disabled until then, so an early click can't send a plain browser form.
 */
export function useHydrated() {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}
