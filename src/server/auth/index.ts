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
  rateLimit: process.env.NODE_ENV === "production",
  // Lets Server Actions set the session cookie. Must stay the last plugin.
  plugins: [nextCookies()],
});
