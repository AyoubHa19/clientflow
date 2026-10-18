// Client health (Stage 17): a simple, explained signal, not a score. It
// looks at two things the app knows for sure: what the client's work paid
// per hour compared with the workspace's average, and how much of their
// work is overdue. Every level comes with its reasons in words.

export type HealthLevel = "good" | "watch" | "risk" | "unknown";

export type HealthInput = {
  /** The client's real hourly rate (minor units), or null without fees and time. */
  rate: number | null;
  /** The workspace's average hourly rate over all clients, or null. */
  averageRate: number | null;
  /** Open tasks and projects of theirs past their due date. */
  overdue: number;
};

export type Health = { level: HealthLevel; reasons: string[] };

/** Below these shares of the average rate: at risk, then worth watching. */
export const RISK_RATE_SHARE = 0.6;
export const WATCH_RATE_SHARE = 0.85;
/** Overdue items for "watch" and for "at risk". */
export const WATCH_OVERDUE = 1;
export const RISK_OVERDUE = 3;

const ORDER: HealthLevel[] = ["unknown", "good", "watch", "risk"];
const worse = (a: HealthLevel, b: HealthLevel) => (ORDER.indexOf(a) > ORDER.indexOf(b) ? a : b);

export function clientHealth({ rate, averageRate, overdue }: HealthInput): Health {
  let level: HealthLevel = "unknown";
  const reasons: string[] = [];

  if (rate !== null && averageRate !== null && averageRate > 0) {
    const share = rate / averageRate;
    const percent = Math.round(Math.abs(1 - share) * 100);
    if (share < RISK_RATE_SHARE) {
      level = worse(level, "risk");
      reasons.push(`Pays ${percent}% less per hour than your average`);
    } else if (share < WATCH_RATE_SHARE) {
      level = worse(level, "watch");
      reasons.push(`Pays ${percent}% less per hour than your average`);
    } else {
      level = worse(level, "good");
      reasons.push(
        share >= 1.15
          ? `Pays ${percent}% more per hour than your average`
          : "Pays about your average per hour",
      );
    }
  }

  if (overdue >= RISK_OVERDUE) {
    level = worse(level, "risk");
  } else if (overdue >= WATCH_OVERDUE) {
    level = worse(level, "watch");
  } else if (level !== "unknown" || rate !== null) {
    level = worse(level, "good");
  }
  if (overdue > 0) {
    reasons.push(`${overdue} overdue ${overdue === 1 ? "task or project" : "tasks or projects"}`);
  } else if (level !== "unknown") {
    reasons.push("Nothing overdue");
  }

  if (level === "unknown") {
    reasons.push("Log time on a project with a fee to compare what they pay per hour");
  }
  return { level, reasons };
}

export const HEALTH_LABELS: Record<HealthLevel, string> = {
  good: "Good",
  watch: "Watch",
  risk: "At risk",
  unknown: "Not enough data",
};
