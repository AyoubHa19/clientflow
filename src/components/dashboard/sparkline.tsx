import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * A small glowing trend line (oldest first): a gradient stroke that draws
 * itself in, a soft fill under it, and a lit dot on the latest value.
 * Decorative: the card next to it says the numbers in words.
 */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const id = useId();
  const width = 120;
  const height = 40;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((value, index) => [
    index * step,
    height - 5 - (value / max) * (height - 12),
  ]);
  // A gentle curve through the points (midpoint smoothing).
  const line = points
    .map(([x, y], index) => {
      if (index === 0) return `M${x},${y}`;
      const [px, py] = points[index - 1]!;
      const mx = (px + x) / 2;
      return `C${mx},${py} ${mx},${y} ${x},${y}`;
    })
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const [lastX, lastY] = points[points.length - 1] ?? [width, height];

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-10 w-full overflow-visible", className)}
    >
      <defs>
        <linearGradient id={`${id}-stroke`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--chart-2)" />
          <stop offset="100%" stopColor="var(--brand)" />
        </linearGradient>
        <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={area} fill={`url(#${id}-fill)`} className="spark-fade" />
      <path
        d={line}
        pathLength={1}
        fill="none"
        stroke={`url(#${id}-stroke)`}
        strokeWidth="2.4"
        strokeLinecap="round"
        filter={`url(#${id}-glow)`}
        className="spark-draw"
      />
      <circle
        cx={lastX}
        cy={lastY}
        r="6"
        fill="var(--brand)"
        opacity="0.2"
        className="spark-pulse"
      />
      <circle
        cx={lastX}
        cy={lastY}
        r="3"
        fill="var(--brand)"
        stroke="var(--card)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
