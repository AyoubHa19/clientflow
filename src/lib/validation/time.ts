import { z } from "zod";
import { durationField } from "@/lib/time";
import { optionalDay, optionalText } from "./fields";
import { isUuid } from "./ids";

// Time entries (Stage 17), shared by the form and the server.

export const TIME_NOTE_LIMIT = 200;

const optionalId = (error: string) =>
  z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || isUuid(value), { error });

/** Logging time by hand: the day, how long, and optionally the task and a note. */
export const timeEntrySchema = z.object({
  projectId: z.string().refine(isUuid, { error: "Choose a project." }),
  taskId: optionalId("Choose a task from the list."),
  day: optionalDay("Enter a valid date.").refine((day) => day !== null, {
    error: "Enter the day you worked.",
  }),
  duration: durationField,
  note: optionalText(TIME_NOTE_LIMIT),
});

export type TimeEntryInput = z.infer<typeof timeEntrySchema>;

/** Starting a timer: on a project, and optionally one of its tasks. */
export const timerSchema = z.object({
  projectId: z.string().refine(isUuid, { error: "Choose a project." }),
  taskId: optionalId("Choose a task from the list."),
});
