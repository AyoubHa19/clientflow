import { cn } from "@/lib/utils";
import { MARK_MEET, MARK_PATH, MARK_VIEWBOX } from "./mark-path";

/** A four-pointed star of radius r around (x, y). */
function starPath(x: number, y: number, r: number) {
  const k = r * 0.18;
  return [
    `M${x} ${y - r}`,
    `C${x + k} ${y - k} ${x + k} ${y - k} ${x + r} ${y}`,
    `C${x + k} ${y + k} ${x + k} ${y + k} ${x} ${y + r}`,
    `C${x - k} ${y + k} ${x - k} ${y + k} ${x - r} ${y}`,
    `C${x - k} ${y - k} ${x - k} ${y - k} ${x} ${y - r}Z`,
  ].join(" ");
}

const STAR = starPath(MARK_MEET.x, MARK_MEET.y, 165);

/**
 * The gradients the logo uses, defined once per page (in the root layout),
 * so every logo can point at them without repeating ids. Their colours are
 * CSS variables, so they follow light and dark mode.
 */
export function BrandDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="cf-logo-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--logo-from)" }} />
          <stop offset="1" style={{ stopColor: "var(--logo-to)" }} />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * The ClientFlow mark: two figures reaching for each other (the user's own
 * drawing), in the sky gradient, with a thin orbit around them and a star
 * twinkling where their hands meet. `tone="white"` is for the sky photos.
 */
export function LogoMark({
  className,
  tone = "brand",
}: {
  className?: string;
  tone?: "brand" | "white";
}) {
  const fill = tone === "white" ? "#ffffff" : "url(#cf-logo-sky)";
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn("logo-mark size-8 shrink-0", className)}>
      <ellipse
        cx="50"
        cy="54"
        rx="46"
        ry="19"
        fill="none"
        stroke={fill}
        strokeWidth="2.2"
        opacity="0.55"
        transform="rotate(-18 50 54)"
        className="logo-orbit"
      />
      <svg x="3" y="3" width="94" height="94" viewBox={MARK_VIEWBOX}>
        <path d={MARK_PATH} fill={fill} />
        <path
          d={STAR}
          className={cn("logo-star", tone === "white" ? "fill-white" : "fill-(--logo-star)")}
        />
      </svg>
    </svg>
  );
}

// Low behind the F, up across the l, straight through the middle of the o
// (y 17 is the o's middle, measured), down across the w.
const RIBBON = "M0 31 C 14 31, 20 17, 35 17 L 60 17 C 75 17, 82 27, 101 22";

/** The ribbon that weaves through "Flow": drawn behind it, and again in front over l and w. */
function Ribbon({ side }: { side: "back" | "front" }) {
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      aria-hidden
      className={`wordmark-ribbon wordmark-ribbon-${side}`}
    >
      <path d={RIBBON} className="wordmark-band" />
      <path d={RIBBON} pathLength={100} className="wordmark-pulse" />
    </svg>
  );
}

/** The mark and the name; a ribbon of light flows through "Flow". */
export function Logo({ className, tone }: { className?: string; tone?: "brand" | "white" }) {
  return (
    <span
      className={cn(
        "group/logo flex items-center gap-2",
        tone === "white" && "logo-white",
        className,
      )}
    >
      <LogoMark tone={tone} />
      <span className="wordmark text-[0.95rem] font-semibold tracking-tight">
        Client
        <span className="wordmark-flow">
          <Ribbon side="back" />
          <span className="wordmark-text">Flow</span>
          <Ribbon side="front" />
        </span>
      </span>
    </span>
  );
}
