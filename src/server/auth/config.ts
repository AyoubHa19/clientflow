import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import type { Db } from "@/server/db/client";
import { PASSWORD_MAX, PASSWORD_MIN, signUpSchema } from "@/lib/validation/auth";

const DAY = 60 * 60 * 24;

type AuthSettings = {
  db: Db;
  secret: string;
  baseURL: string;
  /** Rate limiting is on in production; tests turn it on to check it. */
  rateLimit?: boolean;
  plugins?: BetterAuthPlugin[];
};

/**
 * Better Auth's setup: email and password, sessions kept in our database.
 * The app's instance is in ./index.ts; tests build their own with this.
 *
 * Sign-in and sign-up must go through the HTTP endpoints (/api/auth/...,
 * as the forms do with authClient): rate limiting and the Origin check
 * against cross-site requests run there, not in direct auth.api calls.
 */
export function createAuth({ db, secret, baseURL, rateLimit, plugins = [] }: AuthSettings) {
  return betterAuth({
    appName: "ClientFlow",
    secret,
    baseURL,
    database: prismaAdapter(db, { provider: "postgresql", transaction: true }),
    emailAndPassword: {
      enabled: true,
      // Passwords are hashed with scrypt by Better Auth; never stored as text.
      minPasswordLength: PASSWORD_MIN,
      maxPasswordLength: PASSWORD_MAX,
      autoSignIn: true,
    },
    hooks: {
      // Better Auth checks the email and password itself; this applies the
      // same rules as the form to everything (the name too) on the server.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email") return;
        const result = signUpSchema.safeParse(ctx.body);
        if (!result.success) {
          throw new APIError("BAD_REQUEST", {
            code: "INVALID_SIGN_UP",
            message: result.error.issues[0]?.message ?? "Check the form and try again.",
          });
        }
      }),
    },
    session: {
      expiresIn: 7 * DAY,
      // Using the app extends the session, at most once a day.
      updateAge: DAY,
    },
    rateLimit: {
      enabled: rateLimit,
      // Kept in the database: serverless functions don't share memory.
      storage: "database",
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
    advanced: {
      // Requests that carry a session cookie must come from this site (a
      // defence against cross-site request forgery). Better Auth skips the
      // check when NODE_ENV is "test"; saying so here keeps it on there
      // too, so the tests check what production does.
      disableOriginCheck: false,
    },
    telemetry: { enabled: false },
    plugins,
  });
}

export type Auth = ReturnType<typeof createAuth>;
