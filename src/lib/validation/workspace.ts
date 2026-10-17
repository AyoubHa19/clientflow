import { z } from "zod";
import { hasNoControlCharacters, UNUSUAL_CHARACTERS } from "./fields";

// Shared by the onboarding and settings forms and the server.

export const WORKSPACE_NAME_MAX = 100;

/** Whether the runtime knows this IANA time zone ("Africa/Casablanca"). */
export function isValidTimeZone(value: string) {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const workspaceSchema = z.object({
  name: z
    .string({ error: "Enter a name for your workspace." })
    .trim()
    .min(1, { error: "Enter a name for your workspace." })
    .max(WORKSPACE_NAME_MAX, { error: `Use ${WORKSPACE_NAME_MAX} characters or fewer.` })
    .refine(hasNoControlCharacters, { error: UNUSUAL_CHARACTERS }),
  timezone: z
    .string({ error: "Choose a time zone." })
    .refine(isValidTimeZone, { error: "Choose a time zone from the list." }),
});

export type WorkspaceInput = z.infer<typeof workspaceSchema>;

/** Every time zone the runtime knows, for the picker. */
export function timeZoneOptions(): string[] {
  const zones = Intl.supportedValuesOf("timeZone");
  return zones.includes("UTC") ? zones : ["UTC", ...zones];
}
