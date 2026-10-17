"use client";

import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { useListHref } from "./list-memory";

export type Crumb = { label: string; href?: string };

/**
 * Where a page sits: "Clients › Atlas Café › Edit". The first crumb is the
 * list, and goes back to it with the search and filters last used there.
 * The last crumb is the current page.
 */
export function Breadcrumbs({ list, items }: { list: Crumb & { href: string }; items: Crumb[] }) {
  const listHref = useListHref(list.href);
  const crumbs = [{ ...list, href: listHref }, ...items];

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li
              key={`${index}-${crumb.label}`}
              className={
                last
                  ? "min-w-0 truncate"
                  : index === 0
                    ? "flex shrink-0 items-center gap-1.5"
                    : "flex min-w-0 items-center gap-1.5"
              }
            >
              {last ? (
                <span aria-current="page" className="text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <>
                  <Link
                    href={crumb.href ?? "#"}
                    className="min-w-0 truncate rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {crumb.label}
                  </Link>
                  <ChevronRightIcon aria-hidden className="size-3.5 shrink-0" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
