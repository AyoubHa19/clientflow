import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** "21–40 of 57" with Previous / Next links built by `hrefFor(page)`. */
export function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  hrefFor,
  noun,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
  noun: string;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pages"
      className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
    >
      <p aria-live="polite">
        {from}–{to} of {total} {noun}
      </p>
      {pageCount > 1 && (
        <div className="flex gap-2">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={hrefFor(page - 1)} rel="prev">
                <ChevronLeftIcon aria-hidden data-icon="inline-start" />
                Previous
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeftIcon aria-hidden data-icon="inline-start" />
              Previous
            </Button>
          )}
          <span className="self-center px-1">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Button asChild variant="outline" size="sm">
              <Link href={hrefFor(page + 1)} rel="next">
                Next
                <ChevronRightIcon aria-hidden data-icon="inline-end" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
              <ChevronRightIcon aria-hidden data-icon="inline-end" />
            </Button>
          )}
        </div>
      )}
    </nav>
  );
}
