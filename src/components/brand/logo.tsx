import { cn } from "@/lib/utils";

/** The ClientFlow mark: an open "C" with a client dot, in the brand colour. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="9" className="fill-brand" />
      <path
        d="M21.5 11.2a7 7 0 1 0 0 9.6"
        fill="none"
        strokeWidth="3.2"
        strokeLinecap="round"
        className="stroke-brand-foreground"
      />
      <circle cx="23" cy="16" r="1.9" className="fill-brand-foreground" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[0.95rem] font-semibold tracking-tight">ClientFlow</span>
    </span>
  );
}
