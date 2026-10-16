import { createAuthClient } from "better-auth/react";

// The browser side of Better Auth: calls /api/auth/... on this same site.
export const authClient = createAuthClient();

/** A message people can act on, from a Better Auth error. */
export function authErrorMessage(error: { code?: string; status?: number; message?: string }) {
  if (error.status === 429 || error.code === "TOO_MANY_REQUESTS") {
    return "Too many attempts. Wait a minute, then try again.";
  }
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "Email or password is incorrect.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with this email already exists. Sign in instead.";
    case "INVALID_SIGN_UP":
      return error.message ?? "Check the form and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
