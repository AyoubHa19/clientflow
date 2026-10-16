import { Suspense } from "react";
import { CheckCircle2Icon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
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

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Suspense fallback={null}>
        <SignedInRedirect />
      </Suspense>

      <aside className="relative hidden flex-col justify-between overflow-clip bg-primary p-10 text-primary-foreground lg:flex dark:border-r dark:bg-card dark:text-foreground">
        <Logo />
        <div className="max-w-md">
          <p className="text-3xl leading-tight font-semibold tracking-tight text-balance">
            Your client work, organised in one calm place.
          </p>
          <ul className="mt-8 grid gap-4">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm opacity-85">
                <CheckCircle2Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs opacity-75">Built for freelancers, consultants and small agencies.</p>
      </aside>

      <main className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between lg:justify-end">
          <Logo className="lg:hidden" />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
