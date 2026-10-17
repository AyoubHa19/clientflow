/** "3 of 5 tasks done" with a bar (a real progressbar for screen readers). */
export function ProgressBar({
  done,
  total,
  compact = false,
}: {
  done: number;
  total: number;
  compact?: boolean;
}) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const label =
    total === 0 ? "No tasks yet" : `${done} of ${total} ${total === 1 ? "task" : "tasks"} done`;
  return (
    <div className={compact ? "grid min-w-28 gap-1" : "grid gap-1.5"}>
      <div
        role="progressbar"
        aria-label="Tasks done"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={label}
        className="h-1.5 w-full overflow-clip rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
