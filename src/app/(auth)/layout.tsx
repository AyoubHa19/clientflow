import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2Icon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Sky } from "@/components/marketing/sky";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { redirectIfSignedIn } from "@/server/auth/session";

const POINTS = [
  "Clients and leads, with every detail in one place",
  "Projects and tasks, with what's due and what's late",
  "A dashboard built from your real numbers",
];

// Someone already signed in has no business here: send them to the app.
async function SignedInRedirect() {
  await redirectIfSignedIn();
  return null;
}

/**
 * Sign-in and sign-up: the same sky as the landing page, with the form on
 * frosted glass. The headline sits in the sky's deeper top half, where
 * white text keeps its contrast.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <Suspense fallback={null}>
        <SignedInRedirect />
      </Suspense>
      <Sky className="-z-10" fade={false} />

      <header className="flex items-center justify-between px-4 py-4 text-white sm:px-8">
        <Link
          href="/"
          aria-label="ClientFlow home"
          className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-white/60"
        >
          <Logo tone="white" />
        </Link>
        <ThemeToggle />
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-10 px-4 pt-6 pb-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:pt-16">
        <aside className="hidden text-white lg:block">
          <p className="max-w-md text-4xl leading-tight font-semibold tracking-tight text-balance">
            Your client work, organised in one calm place.
          </p>
          <ul className="mt-8 grid max-w-md gap-4">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-white/90">
                <CheckCircle2Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </aside>

        <main className="mx-auto w-full max-w-sm rounded-3xl glass p-6 sm:p-8 lg:max-w-none">
          {children}
        </main>
      </div>
    </div>
  );
}
