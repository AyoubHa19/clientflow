import { z } from "zod";

// Time tracking (Stage 17): durations are whole minutes.

/** The longest single entry: a day. A timer left running is capped to this. */
export const MAX_ENTRY_MINUTES = 24 * 60;

export const DURATION_HINT = 'Like "1:30", "1h 30m", "90m" or "1.5" (hours).';
const INVALID = 'Enter a duration like "1:30", "90m" or "1.5".';
const TOO_LONG = "One entry can be 24 hours at most.";
const TOO_SHORT = "Enter at least 1 minute.";

/**
 * Reads a duration someone typed, in minutes: "1:30", "1h30", "1h 30m",
 * "2h", "45m", "45 min", "1.5" or "1,5" (hours), "2" (hours).
 */
export function parseDuration(text: string): { minutes: number } | { error: string } {
  const value = text.trim().toLowerCase().replace(/\s+/g, "");
  let minutes: number | null = null;
  let match: RegExpExecArray | null;
  if ((match = /^(\d{1,2}):([0-5]\d)$/.exec(value))) {
    minutes = Number(match[1]) * 60 + Number(match[2]);
  } else if ((match = /^(\d{1,2})h(?:(\d{1,2})(?:m|min)?)?$/.exec(value))) {
    if (match[2] && Number(match[2]) > 59) return { error: INVALID };
    minutes = Number(match[1]) * 60 + Number(match[2] ?? 0);
  } else if ((match = /^(\d{1,4})(?:m|min|mins|minutes)$/.exec(value))) {
    minutes = Number(match[1]);
  } else if ((match = /^(\d{1,2})(?:[.,](\d{1,2}))?$/.exec(value))) {
    minutes = Math.round(Number(`${match[1]}.${match[2] ?? "0"}`) * 60);
  }
  if (minutes === null) return { error: INVALID };
  if (minutes < 1) return { error: TOO_SHORT };
  if (minutes > MAX_ENTRY_MINUTES) return { error: TOO_LONG };
  return { minutes };
}

/** A required duration field, in minutes. */
export const durationField = z.string({ error: INVALID }).transform((value, ctx) => {
  const result = parseDuration(value);
  if ("error" in result) {
    ctx.addIssue({ code: "custom", message: value.trim() ? result.error : INVALID });
    return z.NEVER;
  }
  return result.minutes;
});

/** Minutes for people to read: "1h 30m", "45m", "2h". */
export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** A running timer's clock: "0:04:09", "1:02:03". */
export function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Whole minutes between a timer's start and stop: at least 1, at most a day. */
export function timerMinutes(startedAt: Date, stoppedAt: Date) {
  const minutes = Math.round((stoppedAt.getTime() - startedAt.getTime()) / 60_000);
  return Math.min(MAX_ENTRY_MINUTES, Math.max(1, minutes));
}

/**
 * What the work really paid per hour, in minor units: the fee over the
 * hours logged. Null without a fee or without time.
 */
export function hourlyRate(feeMinor: number | null, minutes: number) {
  if (feeMinor === null || minutes <= 0) return null;
  return Math.round((feeMinor * 60) / minutes);
}
