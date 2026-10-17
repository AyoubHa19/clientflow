import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  FolderKanbanIcon,
  GlobeLockIcon,
  HistoryIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  ShieldCheckIcon,
  TargetIcon,
  UsersIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { Sky } from "@/components/marketing/sky";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Visitors who aren't signed in see this at "/" (proxy.ts rewrites to it).
export const metadata: Metadata = {
  title: { absolute: "ClientFlow · Client work, organised" },
  description:
    "Clients, leads, projects and tasks in one calm workspace, for freelancers and small agencies.",
};

const FEATURES = [
  {
    icon: UsersIcon,
    title: "Clients",
    text: "Every client with their contact details, notes and projects, searchable in a second.",
  },
  {
    icon: TargetIcon,
    title: "Leads pipeline",
    text: "Drag leads from New to Won on a board, and turn a won lead into a client in one click.",
  },
  {
    icon: FolderKanbanIcon,
    title: "Projects",
    text: "Start and due dates, status and progress, so you always know what's late.",
  },
  {
    icon: ListChecksIcon,
    title: "Tasks",
    text: "Add a task in one line, tick it off, and filter what's overdue or due this week.",
  },
  {
    icon: LayoutDashboardIcon,
    title: "Dashboard",
    text: "Your real numbers at a glance: what's coming up, your pipeline and your win rate.",
  },
  {
    icon: HistoryIcon,
    title: "Activity",
    text: "A record of every change, so you can always see what happened and when.",
  },
];

const SECURITY = [
  {
    icon: ShieldCheckIcon,
    title: "Your workspace is yours",
    text: "Every request is checked on the server: no one else can see or change your data.",
  },
  {
    icon: KeyRoundIcon,
    title: "Passwords stay secret",
    text: "Hashed with scrypt, never stored as text, and sign-in attempts are rate limited.",
  },
  {
    icon: GlobeLockIcon,
    title: "Hosted in Europe",
    text: "The app and its database run in Frankfurt, over HTTPS, with strict security headers.",
  },
];

function Header() {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link
        href="/"
        aria-label="ClientFlow home"
        className="rounded-lg text-white outline-none focus-visible:ring-3 focus-visible:ring-white/60"
      >
        <Logo tone="white" />
      </Link>
      <nav
        aria-label="Sections"
        className="hidden items-center gap-6 text-sm text-white/90 md:flex"
      >
        <a href="#features" className="rounded-sm hover:text-white">
          Features
        </a>
        <a href="#security" className="rounded-sm hover:text-white">
          Security
        </a>
      </nav>
      <div className="flex items-center gap-1.5 text-white">
        <ThemeToggle />
        <Button
          asChild
          variant="ghost"
          className="text-white hover:bg-white/15 hover:text-white dark:hover:bg-white/10"
        >
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button asChild className="bg-white text-[oklch(0.255_0.045_270)] hover:bg-white/90">
          <Link href="/sign-up">Get started</Link>
        </Button>
      </div>
    </header>
  );
}

export default function WelcomePage() {
  return (
    <div className="relative isolate overflow-x-clip">
      <Sky className="-z-10 h-[46rem] sm:h-[52rem]" />
      <Header />
      <main id="main">
        {/* Hero: the promise, and the product rising into view. */}
        <section aria-labelledby="hero-title" className="pb-10">
          <div className="hero-copy mx-auto max-w-3xl px-4 pt-14 pb-12 text-center text-white sm:pt-20">
            <h1
              id="hero-title"
              className="text-4xl leading-[1.08] font-semibold tracking-tight text-balance drop-shadow-sm sm:text-6xl"
            >
              Your clients. Your work.
              <br />
              One calm place.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-white/90 sm:text-lg">
              ClientFlow keeps your clients, leads, projects and tasks together, so you always know
              what&apos;s next. Free, for freelancers and small agencies.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="h-11 bg-white px-5 text-[oklch(0.255_0.045_270)] hover:bg-white/90"
              >
                <Link href="/sign-up">
                  Get started free
                  <ArrowRightIcon aria-hidden data-icon="inline-end" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 border-white/50 bg-white/10 px-5 text-white hover:bg-white/20 hover:text-white dark:border-white/30 dark:bg-white/5 dark:hover:bg-white/15"
              >
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>

        {/*
          The product: one preview that rises in under the hero, then (on
          large screens) stays pinned as you scroll and turns into a tilted
          3D card on the right while the text slides in on the left.
        */}
        <section aria-labelledby="glance-title" className="glance">
          <div className="glance-stage">
            <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 sm:px-6">
              <div className="rise mx-auto w-full max-w-5xl origin-top">
                <DashboardPreview className="glance-preview" />
              </div>
              <div className="glance-copy fade-up">
                <h2
                  id="glance-title"
                  className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl"
                >
                  Your whole week, at a glance
                </h2>
                <p className="mt-4 text-pretty text-muted-foreground">
                  Open ClientFlow and see what&apos;s overdue, what&apos;s due soon and how your
                  leads are moving. Every number comes from your own work, nothing made up.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          aria-labelledby="features-title"
          className="scroll-mt-6 py-16 lg:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <p className="fade-up mx-auto w-fit rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
              Features
            </p>
            <h2
              id="features-title"
              className="fade-up mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
            >
              Everything a freelancer juggles, in one place
            </h2>
            <ul className="mx-auto mt-12 grid max-w-4xl grid-cols-[minmax(0,1fr)] gap-6 text-left">
              {/* One at a time, each below the last, zig-zagging from its own side. */}
              {FEATURES.map(({ icon: Icon, title, text }, index) => (
                <li
                  key={title}
                  className={cn(
                    "w-full surface p-5 sm:max-w-md",
                    index % 2 === 0
                      ? "slide-from-left justify-self-start"
                      : "slide-from-right justify-self-end",
                  )}
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-pretty text-muted-foreground">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/*
          "Private by design" pops in and stays put while the last call
          ("Clear skies") scrolls up over it, like a card laid on top.
        */}
        <div className="cover-stack relative pb-[30vh]">
          <section
            id="security"
            aria-labelledby="security-title"
            className="sticky top-[12vh] scroll-mt-6 pt-16 lg:pt-24"
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="covered">
                <div className="pop-in grid gap-8 surface p-6 sm:p-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
                  <div>
                    <h2
                      id="security-title"
                      className="text-3xl font-semibold tracking-tight text-balance"
                    >
                      Private by design
                    </h2>
                    <p className="mt-3 text-pretty text-muted-foreground">
                      Client work is confidential. ClientFlow is built to keep it that way.
                    </p>
                  </div>
                  <ul className="grid grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-3">
                    {SECURITY.map(({ icon: Icon, title, text }) => (
                      <li key={title}>
                        <Icon aria-hidden className="size-5 text-brand" />
                        <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                        <p className="mt-1 text-sm text-pretty text-muted-foreground">{text}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* A last call under the sky, sliding up over "Private by design". */}
          <section
            aria-labelledby="cta-title"
            className="cta-cover sticky top-[18vh] z-10 mt-[30vh] px-4 sm:px-6"
          >
            <div className="relative isolate mx-auto max-w-6xl overflow-clip rounded-3xl px-6 py-16 text-center text-white shadow-[0_-30px_80px_-30px_oklch(0.2_0.05_260/45%)] sm:py-20">
              <Sky className="-z-10" fade={false} />
              <div
                aria-hidden
                className="absolute inset-0 -z-10 bg-[oklch(0.25_0.05_255/35%)] dark:bg-[oklch(0.05_0_0/45%)]"
              />
              <h2
                id="cta-title"
                className="fade-up text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
              >
                Clear skies for your client work
              </h2>
              <p className="fade-up mx-auto mt-3 max-w-lg text-white/90">
                Create a free account and set up your workspace in under a minute.
              </p>
              <Button
                asChild
                size="lg"
                className="fade-up mt-8 h-11 bg-white px-5 text-[oklch(0.255_0.045_270)] hover:bg-white/90"
              >
                <Link href="/sign-up">
                  Get started free
                  <ArrowRightIcon aria-hidden data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pb-10 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
        <p>ClientFlow, for freelancers, consultants and small agencies.</p>
        <p>
          Sky photos by Harper van Mourik and Vlad ION on{" "}
          <a
            href="https://unsplash.com"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Unsplash
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
