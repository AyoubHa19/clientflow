"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CornerDownLeftIcon,
  FolderKanbanIcon,
  ListChecksIcon,
  Loader2Icon,
  SearchIcon,
  TargetIcon,
  UsersIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { searchAction } from "@/server/search/actions";
import type { SearchHit, SearchKind } from "@/server/search/service";

const KINDS: Record<SearchKind, { label: string; icon: typeof UsersIcon }> = {
  client: { label: "Clients", icon: UsersIcon },
  lead: { label: "Leads", icon: TargetIcon },
  project: { label: "Projects", icon: FolderKanbanIcon },
  task: { label: "Tasks", icon: ListChecksIcon },
};
const ORDER: SearchKind[] = ["client", "lead", "project", "task"];

/**
 * Search the whole workspace: the bar at the top of the app, or Ctrl+K /
 * ⌘K anywhere. A combobox: type, move with the arrow keys, Enter opens.
 */
export function CommandMenu({ className }: { className?: string }) {
  const router = useRouter();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searched, setSearched] = useState("");
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();

  // Ctrl+K / ⌘K opens it from anywhere in the app.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Search a moment after typing stops; only the latest answer counts.
  useEffect(() => {
    const text = query.trim();
    if (!open || !text) return;
    let current = true;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const result = await searchAction(text);
        if (!current) return;
        setHits(result);
        setSearched(text);
        setActive(0);
      });
    }, 180);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, open]);

  const visible = query.trim() ? hits : [];
  const groups = ORDER.map((kind) => ({
    kind,
    items: visible.filter((h) => h.kind === kind),
  })).filter((group) => group.items.length > 0);
  const flat = groups.flatMap((group) => group.items);

  function go(hit: SearchHit | undefined) {
    if (!hit) return;
    setOpen(false);
    router.push(hit.href);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setHits([]);
      setSearched("");
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (flat.length ? (index + 1) % flat.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (flat.length ? (index - 1 + flat.length) % flat.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(flat[active]);
    }
  }

  const listId = `${id}-results`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const text = query.trim();
  const status = !text
    ? "Type a name: a client, lead, project or task."
    : pending || searched !== text
      ? "Searching…"
      : flat.length === 0
        ? `Nothing matches “${text}”.`
        : `${flat.length} ${flat.length === 1 ? "result" : "results"}.`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Control+K Meta+K"
        className={cn(
          "flex h-10 w-full items-center gap-2.5 rounded-full border border-(--surface-edge) bg-(--surface-fill) px-3.5 text-sm text-muted-foreground shadow-(--shadow-card) transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
      >
        <SearchIcon aria-hidden className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">Search clients, leads, projects…</span>
        <kbd className="hidden rounded-md border bg-muted px-1.5 py-0.5 font-sans text-[0.7rem] sm:inline">
          Ctrl K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="top-[18%] translate-y-0 gap-0 overflow-clip p-0 sm:max-w-xl"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            input.current?.focus();
          }}
        >
          <DialogTitle className="sr-only">Search the workspace</DialogTitle>
          <DialogDescription className="sr-only">
            Find a client, lead, project or task by name. Use the arrow keys to choose, and Enter to
            open it.
          </DialogDescription>
          <div className="flex items-center gap-2.5 border-b px-4">
            {pending ? (
              <Loader2Icon
                aria-hidden
                className="size-4 shrink-0 animate-spin text-muted-foreground"
              />
            ) : (
              <SearchIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            )}
            <input
              ref={input}
              role="combobox"
              aria-expanded={flat.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={flat.length ? optionId(active) : undefined}
              aria-label="Search"
              value={query}
              maxLength={100}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search clients, leads, projects and tasks"
              className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <kbd className="rounded-md border bg-muted px-1.5 py-0.5 text-[0.7rem] text-muted-foreground">
              Esc
            </kbd>
          </div>

          <div
            id={listId}
            role="listbox"
            aria-label="Results"
            className="max-h-[22rem] overflow-y-auto p-2"
          >
            {groups.map((group) => {
              const { label, icon: Icon } = KINDS[group.kind];
              return (
                <div key={group.kind} role="group" aria-label={label} className="mb-1">
                  <p
                    aria-hidden
                    className="px-2.5 pt-2 pb-1 text-xs font-medium text-muted-foreground"
                  >
                    {label}
                  </p>
                  {group.items.map((hit) => {
                    const index = flat.indexOf(hit);
                    const selected = index === active;
                    return (
                      <div
                        key={`${hit.kind}-${hit.id}`}
                        id={optionId(index)}
                        role="option"
                        aria-selected={selected}
                        onMouseMove={() => setActive(index)}
                        onClick={() => go(hit)}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2",
                          selected && "bg-brand-soft",
                        )}
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-brand">
                          <Icon aria-hidden className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{hit.title}</span>
                          {hit.detail && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {hit.detail}
                            </span>
                          )}
                        </span>
                        {selected && (
                          <CornerDownLeftIcon
                            aria-hidden
                            className="size-4 shrink-0 text-muted-foreground"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <p
            role="status"
            className={cn(
              "px-4 pb-6 text-center text-sm text-muted-foreground",
              flat.length > 0 && "sr-only",
            )}
          >
            {status}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
