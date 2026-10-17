import { z } from "zod";
import { hasNoControlCharacters, UNUSUAL_CHARACTERS } from "./fields";

// Shared by the sign-in and sign-up forms and by the server, which checks
// everything again: the browser can't be trusted to have done it.

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, { error: "Enter your email address." })
  .max(320, { error: "That email address is too long." })
  .pipe(z.email({ error: "Enter a valid email address." }));

export const signInSchema = z.object({
  email,
  // Only presence is checked here: the length rules are for new passwords.
  password: z
    .string()
    .min(1, { error: "Enter your password." })
    .max(PASSWORD_MAX, { error: "Email or password is incorrect." }),
});

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Enter your name." })
    .max(200, { error: "Use 200 characters or fewer." })
    .refine(hasNoControlCharacters, { error: UNUSUAL_CHARACTERS }),
  email,
  password: z
    .string()
    .min(PASSWORD_MIN, { error: `Use at least ${PASSWORD_MIN} characters.` })
    .max(PASSWORD_MAX, { error: `Use ${PASSWORD_MAX} characters or fewer.` }),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

export { fieldErrors } from "./errors";

const PLACEHOLDER_ORIGIN = "http://clientflow.invalid";

/**
 * Where to go after signing in: only a path inside this app, so a link
 * can't send someone to another site ("open redirect"). The path is read
 * the way a browser reads it, which matters: browsers drop tabs and line
 * breaks, so "/	/evil.com" would become "//evil.com", another site.
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.length > 2000) return "/";
  let url: URL;
  try {
    url = new URL(value, PLACEHOLDER_ORIGIN);
  } catch {
    return "/";
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return "/";
  const path = url.pathname;
  if (path.startsWith("//") || path.startsWith("/sign-in") || path.startsWith("/sign-up")) {
    return "/";
  }
  if (path.startsWith("/api/")) return "/";
  return `${path}${url.search}${url.hash}`;
}
