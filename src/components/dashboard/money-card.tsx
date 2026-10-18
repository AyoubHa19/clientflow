import Link from "next/link";
import { BriefcaseIcon, TrophyIcon, WalletIcon, type LucideIcon } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { leadsHref } from "@/lib/validation/lead";
import type { Money } from "@/server/dashboard/service";

function Figure({
  icon: Icon,
  label,
  amount,
  currency,
  note,
  href,
}: {
  icon: LucideIcon;
  label: string;
  amount: number;
  currency: string;
  note: string;
  href: string;
}) {
  return (
    <div className="relative grid min-w-0 content-start gap-1 rounded-xl p-3 transition-colors hover:bg-brand-soft/40">
      <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon aria-hidden className="size-4 text-brand" />
        {/* The whole tile is the link (the ::after covers it). */}
        <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-xl">
          {label}
        </Link>
      </p>
      <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">
        {formatMoney(amount, currency)}
      </p>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * The money at a glance: what open leads could bring in, what was won this
 * month, and what open projects are worth. Amounts come only from values
 * and fees people entered, so each says how many records it counts.
 */
export function MoneyCard({ money }: { money: Money }) {
  const { currency } = money;
  return (
    <section
      aria-labelledby="money-title"
      className="spotlight relative surface p-2 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
    >
      <h2 id="money-title" className="sr-only">
        Money
      </h2>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-1 sm:grid-cols-3">
        <Figure
          icon={WalletIcon}
          label="Pipeline"
          amount={money.pipeline.total}
          currency={currency}
          note={`From ${plural(money.pipeline.count, "open lead", "open leads")} with a value`}
          href={leadsHref({ view: "list", status: "open", sort: "value" })}
        />
        <Figure
          icon={TrophyIcon}
          label="Won this month"
          amount={money.wonThisMonth.total}
          currency={currency}
          note={plural(money.wonThisMonth.count, "lead won", "leads won")}
          href={leadsHref({ view: "list", status: "won", sort: "value" })}
        />
        <Figure
          icon={BriefcaseIcon}
          label="Open projects"
          amount={money.openProjects.total}
          currency={currency}
          note={`Fees of ${plural(money.openProjects.count, "project", "projects")}`}
          href="/projects"
        />
      </div>
    </section>
  );
}
