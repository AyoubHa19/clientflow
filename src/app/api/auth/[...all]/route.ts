import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

// Better Auth's own endpoints (/api/auth/...). The forms use Server Actions,
// but sign-out and session checks from the browser come through here too.
export const { GET, POST } = toNextJsHandler(auth);
