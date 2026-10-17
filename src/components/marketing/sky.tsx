import { cn } from "@/lib/utils";

/**
 * The drifting sky (clouds by day, stars by night) behind a section. Purely
 * decorative; the styles are `.sky` and `.sky-fade` in globals.css.
 */
export function Sky({ className, fade = true }: { className?: string; fade?: boolean }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <div className="sky" />
      {fade && <div className="sky-fade" />}
    </div>
  );
}
