import { Prisma } from "@/generated/prisma/client";
import { todayIn, toDateOnly } from "@/lib/dates";
import {
  BUILT_IN_PREFIX,
  BUILT_IN_TEMPLATES,
  templateDescriptionSchema,
  templateNameSchema,
  tasksToTemplate,
  templateTasksSchema,
  type TemplateTask,
} from "@/lib/templates";
import { isUuid } from "@/lib/validation/ids";
import type { Db } from "@/server/db/client";
import { forbidden, invalidFields, notFound, ok, type ServiceResult } from "@/server/result";
import type { WorkspaceContext } from "@/server/workspace/service";

// Project templates (Stage 19): the built-in ones, and the workspace's own,
// saved from a project. Every query is limited to the caller's workspace.

type Client = Db | Prisma.TransactionClient;

export type TemplateChoice = { value: string; label: string; ownTemplate: boolean };

/** The templates to start a project from: the built-in ones, then the workspace's. */
export async function templateChoices(db: Db, ctx: WorkspaceContext): Promise<TemplateChoice[]> {
  const own = await db.projectTemplate.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, tasks: true },
  });
  const count = (n: number) => `${n} ${n === 1 ? "task" : "tasks"}`;
  return [
    ...BUILT_IN_TEMPLATES.map((template) => ({
      value: `${BUILT_IN_PREFIX}${template.key}`,
      label: `${template.name} (${count(template.tasks.length)})`,
      ownTemplate: false,
    })),
    ...own.map((template) => ({
      value: template.id,
      label: `${template.name} (${count(readTasks(template.tasks).length)})`,
      ownTemplate: true,
    })),
  ];
}

/** A stored task list, checked; anything odd reads as no tasks. */
function readTasks(value: Prisma.JsonValue): TemplateTask[] {
  const parsed = templateTasksSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

/**
 * A template by its choice value ("builtin:website" or a template id of
 * this workspace), or null if there's no such template.
 */
export async function findTemplate(tx: Client, ctx: WorkspaceContext, value: string) {
  if (value.startsWith(BUILT_IN_PREFIX)) {
    const key = value.slice(BUILT_IN_PREFIX.length);
    const builtIn = BUILT_IN_TEMPLATES.find((template) => template.key === key);
    return builtIn
      ? { name: builtIn.name, description: builtIn.description, tasks: builtIn.tasks }
      : null;
  }
  if (!isUuid(value)) return null;
  const own = await tx.projectTemplate.findFirst({
    where: { id: value, workspaceId: ctx.workspace.id },
    select: { name: true, description: true, tasks: true },
  });
  return own ? { name: own.name, description: own.description, tasks: readTasks(own.tasks) } : null;
}

/**
 * Saves a project's tasks as a template, their due dates turned into days
 * after the project's start. Names are unique within the workspace.
 */
export async function saveAsTemplate(
  db: Db,
  ctx: WorkspaceContext,
  projectId: string,
  input: { name?: unknown },
): Promise<ServiceResult<{ id: string; name: string; tasks: number }>> {
  if (!isUuid(projectId)) return notFound("project");
  const name = templateNameSchema.safeParse(input.name);
  if (!name.success) return invalidFields({ name: name.error.issues[0]!.message });
  const project = await db.project.findFirst({
    where: { id: projectId, workspaceId: ctx.workspace.id },
    select: {
      description: true,
      startDate: true,
      tasks: {
        orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
        select: { title: true, priority: true, dueDate: true },
      },
    },
  });
  if (!project) return notFound("project");
  const tasks = tasksToTemplate(
    project.startDate ? toDateOnly(project.startDate) : null,
    project.tasks.map((task) => ({
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate ? toDateOnly(task.dueDate) : null,
    })),
  );
  const description = templateDescriptionSchema.safeParse(project.description);
  try {
    const template = await db.projectTemplate.create({
      data: {
        workspaceId: ctx.workspace.id,
        name: name.data,
        description: description.success ? description.data : null,
        tasks,
      },
      select: { id: true, name: true },
    });
    return ok({ ...template, tasks: tasks.length });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return invalidFields({ name: "You already have a template with this name." });
    }
    throw error;
  }
}

/** The workspace's own templates, for Settings. */
export async function listTemplates(db: Db, ctx: WorkspaceContext) {
  const rows = await db.projectTemplate.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, tasks: true, createdAt: true },
  });
  return rows.map((row) => ({ ...row, tasks: readTasks(row.tasks) }));
}

/** Deletes one of the workspace's templates (owners only). */
export async function deleteTemplate(
  db: Db,
  ctx: WorkspaceContext,
  id: string,
): Promise<ServiceResult<{ id: string }>> {
  if (ctx.role !== "OWNER") return forbidden("Only the workspace owner can delete templates.");
  if (!isUuid(id)) return notFound("template");
  const deleted = await db.projectTemplate.deleteMany({
    where: { id, workspaceId: ctx.workspace.id },
  });
  return deleted.count === 0 ? notFound("template") : ok({ id });
}

/**
 * Creates a template's tasks for a new project (inside its transaction):
 * due dates counted from the project's start, or from today.
 */
export async function createTemplateTasks(
  tx: Prisma.TransactionClient,
  ctx: WorkspaceContext,
  project: { id: string; startDate: Date | null },
  tasks: TemplateTask[],
) {
  if (tasks.length === 0) return;
  const start = project.startDate ? toDateOnly(project.startDate) : todayIn(ctx.workspace.timezone);
  const startMs = Date.parse(`${start}T00:00:00Z`);
  await tx.task.createMany({
    data: tasks.map((task) => ({
      workspaceId: ctx.workspace.id,
      projectId: project.id,
      title: task.title,
      priority: task.priority,
      dueDate: task.dueInDays === null ? null : new Date(startMs + task.dueInDays * 86_400_000),
    })),
  });
}

export const NO_SUCH_TEMPLATE = { template: "Choose a template from the list." };
