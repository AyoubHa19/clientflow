import { z } from "zod";

// Field rules shared by clients and leads (and later forms).

export const CONTACT_LIMITS = { name: 200, email: 320, phone: 50, company: 200, notes: 5000 };

/** An optional text field: trimmed, and empty means "none" (null). */
export function optionalText(max: number, tooLong = `Use ${max} characters or fewer.`) {
  return z
    .string()
    .trim()
    .max(max, { error: tooLong })
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));
}

/** A required name, trimmed. */
export function requiredName(missing: string, max = CONTACT_LIMITS.name) {
  return z
    .string({ error: missing })
    .trim()
    .min(1, { error: missing })
    .max(max, { error: `Use ${max} characters or fewer.` });
}

/** An optional email, lower-cased. */
export const optionalEmail = optionalText(CONTACT_LIMITS.email, "That email address is too long.")
  .transform((value) => value?.toLowerCase() ?? null)
  .refine((value) => value === null || z.email().safeParse(value).success, {
    error: "Enter a valid email address, or leave it empty.",
  });

/** An optional phone number, kept as typed: digits, spaces and + - ( ) . */
export const optionalPhone = optionalText(CONTACT_LIMITS.phone).refine(
  (value) => value === null || /^\+?[0-9\s().-]*[0-9][0-9\s().-]*$/.test(value),
  { error: "Use digits, spaces and + - ( ) only." },
);

/** First value of a search param that may appear more than once. */
export const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** A page number from the URL: a whole number from 1, else 1. */
export function pageParam(value: string | string[] | undefined) {
  const page = Number(firstParam(value));
  return Number.isInteger(page) && page >= 1 && page <= 100_000 ? page : 1;
}

/** One of `allowed` from the URL, else `fallback`. */
export function choiceParam<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = firstParam(value) ?? "";
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}
