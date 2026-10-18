"use client";

import { useEffect } from "react";

/**
 * Registers the service worker (public/sw.js), which shows an offline page
 * when the connection drops. Production only: in development it would get
 * in the way of reloading.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Not supported or blocked (a private window, say): the app works without it.
    });
  }, []);
  return null;
}
