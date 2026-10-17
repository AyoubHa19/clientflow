"use client";

import { useEffect, useRef } from "react";

export const LEAVE_MESSAGE = "Leave this page? Your changes haven't been saved.";

/** The form's values as text, without React's hidden action fields. */
function snapshot(form: HTMLFormElement) {
  const entries: string[] = [];
  for (const [name, value] of new FormData(form)) {
    if (name.startsWith("$ACTION")) continue;
    entries.push(`${name}=${typeof value === "string" ? value : value.name}`);
  }
  return entries.join("&");
}

/**
 * Asks before leaving a form with unsaved changes: closing or reloading the
 * tab (the browser's own prompt), or following a link inside the app (a
 * confirm dialog). The browser's back button isn't covered: an app can't
 * stop it cleanly.
 *
 * Changes count when the values differ from those the form opened with, so
 * typing something and deleting it again doesn't ask. Sending the form
 * pauses the guard (a save then moves on by itself); `state` is the form's
 * action state, which says how the save went.
 */
export function useUnsavedChanges(
  form: React.RefObject<HTMLFormElement | null>,
  state: { errors?: unknown; saved?: boolean },
) {
  const initial = useRef<string | null>(null);
  const submitting = useRef(false);

  useEffect(() => {
    const element = form.current;
    if (!element) return;
    initial.current = snapshot(element);
    submitting.current = false;

    const isDirty = () =>
      !submitting.current && initial.current !== null && snapshot(element) !== initial.current;

    const onSubmit = () => {
      submitting.current = true;
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty()) event.preventDefault();
    };
    // Capturing on window runs before Next's own link handling.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download") || link.origin !== window.location.origin) return;
      if (link.pathname === window.location.pathname && link.search === window.location.search)
        return;
      if (isDirty() && !window.confirm(LEAVE_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    element.addEventListener("submit", onSubmit);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("click", onClick, true);
    return () => {
      element.removeEventListener("submit", onSubmit);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("click", onClick, true);
    };
  }, [form]);

  // After a save: errors put the guard back on; a save that keeps the form
  // on screen (settings) makes what's shown the new starting point.
  useEffect(() => {
    if (state.errors) submitting.current = false;
    if (state.saved && form.current) {
      submitting.current = false;
      initial.current = snapshot(form.current);
    }
  }, [form, state]);
}
