import { z } from "zod";

const postgresUrl = z
  .string({ error: "is missing" })
  .regex(/^postgres(ql)?:\/\//, { error: "must be a postgres:// connection string" });

const serverEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
  BETTER_AUTH_SECRET: z
    .string({ error: "is missing" })
    .min(32, { error: "must be at least 32 characters (a random string)" }),
  BETTER_AUTH_URL: z.url({ error: "must be the app's address, like http://localhost:3001" }),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Checks the server's settings and names what's wrong, without ever
 * printing a value (they hold passwords).
 */
export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`);
    throw new Error(
      `Server configuration problem: ${problems.join("; ")}. See .env.example for what to set.`,
    );
  }
  return result.data;
}
