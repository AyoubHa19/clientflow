import "server-only";

import { nextCookies } from "better-auth/next-js";
import { db } from "@/server/db";
import { parseServerEnv } from "@/server/env";
import { createAuth } from "./config";

const env = parseServerEnv(process.env);

/** The app's Better Auth instance. */
export const auth = createAuth({
  db,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  // On in production. AUTH_RATE_LIMIT=off exists only for the browser tests,
  // which run a production build and sign up many accounts from one address;
  // never set it on the live site.
  rateLimit: process.env.NODE_ENV === "production" && process.env.AUTH_RATE_LIMIT !== "off",
  // Lets Server Actions set the session cookie. Must stay the last plugin.
  plugins: [nextCookies()],
});
