import { z } from "zod";

const postgresUrl = z
  .string({ error: "is missing" })
  .regex(/^postgres(ql)?:\/\//, { error: "must be a postgres:// connection string" });

const serverEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
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
