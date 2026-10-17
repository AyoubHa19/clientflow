import Link from "next/link";
import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Dashboard } from "@/server/dashboard/service";

const STEPS = [
  { key: "client", label: "Add your first client", href: "/clients/new" },
  { key: "lead", label: "Add a lead", href: "/leads/new" },
  { key: "project", label: "Start a project", href: "/projects/new" },
  { key: "task", label: "Add a task", href: "/tasks" },
] as const;

/** A checklist for a new workspace; each step ticks itself when done. */
export function GettingStarted({ started }: { started: Dashboard["started"] }) {
  const done = STEPS.filter((step) => started[step.key]).length;
  return (
    <section
      aria-labelledby="getting-started-title"
      className="surface border-brand/30 bg-brand-soft/50 p-4"
    >
      <h2 id="getting-started-title" className="font-medium">
        Getting started
      </h2>
      <p className="text-sm text-muted-foreground">
        {done} of {STEPS.length} done. The numbers below fill in as you go.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step) => {
          const complete = started[step.key];
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-border outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                  complete && "text-muted-foreground",
                )}
              >
                {complete ? (
                  <CheckCircle2Icon aria-hidden className="size-4 shrink-0 text-success" />
                ) : (
                  <CircleIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className={cn(complete && "line-through")}>{step.label}</span>
                <span className="sr-only">{complete ? " (done)" : " (to do)"}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
