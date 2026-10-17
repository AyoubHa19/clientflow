"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Each list remembers its last address (search, filters, page) for this tab,
// so "back to the list" returns to where the person was.
const key = (path: string) => `clientflow:list:${path}`;

function read(path: string) {
  try {
    return sessionStorage.getItem(key(path));
  } catch {
    return null; // Storage can be blocked; the plain list will do.
  }
}

/** Put on a list page (inside Suspense): records its current address. */
export function RememberListUrl() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    try {
      sessionStorage.setItem(key(pathname), search ? `${pathname}?${search}` : pathname);
    } catch {
      // Not remembered; links fall back to the plain list.
    }
  }, [pathname, search]);

  return null;
}

const noSubscribe = () => () => {};

/** The list's last address in this tab, or the list itself. */
export function useListHref(path: string) {
  return useSyncExternalStore(
    noSubscribe,
    () => read(path) ?? path,
    () => path, // On the server, and in the first render after it.
  );
}
