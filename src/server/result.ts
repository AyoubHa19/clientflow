import type { z } from "zod";
import { fieldErrors } from "@/lib/validation/errors";

// What the server's rules return: the value, or a reason people can read.
// Expected problems (a bad form, a record that isn't yours) come back as
// results; only real faults throw.

export type FailureCode =
  "INVALID" | "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "ALREADY_HAS_WORKSPACE";

export type Failure = {
  ok: false;
  code: FailureCode;
  message: string;
  errors?: Record<string, string>;
};

export type ServiceResult<T> = { ok: true; value: T } | Failure;

export const ok = <T>(value: T): ServiceResult<T> => ({ ok: true, value });

export function invalid(error: z.ZodError): Failure {
  return {
    ok: false,
    code: "INVALID",
    message: "Check the form and try again.",
    errors: fieldErrors(error),
  };
}

/** A form problem found by a rule rather than the schema. */
export function invalidFields(errors: Record<string, string>): Failure {
  return { ok: false, code: "INVALID", message: "Check the form and try again.", errors };
}

export function notFound(what: string): Failure {
  return { ok: false, code: "NOT_FOUND", message: `That ${what} doesn't exist or isn't yours.` };
}

export function conflict(message: string): Failure {
  return { ok: false, code: "CONFLICT", message };
}

export function forbidden(message: string): Failure {
  return { ok: false, code: "FORBIDDEN", message };
}
