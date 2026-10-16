import { z } from "zod";

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
    .max(200, { error: "Use 200 characters or fewer." }),
  email,
  password: z
    .string()
    .min(PASSWORD_MIN, { error: `Use at least ${PASSWORD_MIN} characters.` })
    .max(PASSWORD_MAX, { error: `Use ${PASSWORD_MAX} characters or fewer.` }),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

export { fieldErrors } from "./errors";

/**
 * Where to go after signing in: only a path inside this app, so a link
 * can't send someone to another site ("open redirect").
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (value.startsWith("/sign-in") || value.startsWith("/sign-up") || value.startsWith("/api/")) {
    return "/";
  }
  return value;
}
