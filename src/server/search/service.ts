import { searchParam } from "@/lib/validation/fields";
import type { Db } from "@/server/db/client";
import type { WorkspaceContext } from "@/server/workspace/service";

export type SearchKind = "client" | "lead" | "project" | "task";

export type SearchHit = {
  kind: SearchKind;
  id: string;
  title: string;
  /** A second line: a company, a client, a project. */
  detail: string | null;
  href: string;
};

/** How many results of each kind the search shows. */
export const SEARCH_PER_KIND = 5;

/**
 * Searches the caller's workspace (only theirs) for clients, leads, projects
 * and tasks whose names contain the text, any case. Archived clients and
 * finished work are included: the search is for finding things.
 */
export async function searchWorkspace(
  db: Db,
  ctx: WorkspaceContext,
  rawQuery: unknown,
): Promise<SearchHit[]> {
  const q = searchParam(typeof rawQuery === "string" ? rawQuery : "");
  if (q.length === 0) return [];
  const workspaceId = ctx.workspace.id;
  const like = { contains: q, mode: "insensitive" as const };
  const take = SEARCH_PER_KIND;

  const [clients, leads, projects, tasks] = await Promise.all([
    db.client.findMany({
      where: { workspaceId, OR: [{ name: like }, { company: like }, { email: like }] },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take,
      select: { id: true, name: true, company: true },
    }),
    db.lead.findMany({
      where: { workspaceId, OR: [{ contactName: like }, { company: like }, { email: like }] },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take,
      select: { id: true, contactName: true, company: true },
    }),
    db.project.findMany({
      where: { workspaceId, name: like },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take,
      select: { id: true, name: true, client: { select: { name: true } } },
    }),
    db.task.findMany({
      where: { workspaceId, title: like },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take,
      select: { id: true, title: true, project: { select: { name: true } } },
    }),
  ]);

  return [
    ...clients.map((c) => ({
      kind: "client" as const,
      id: c.id,
      title: c.name,
      detail: c.company,
      href: `/clients/${c.id}`,
    })),
    ...leads.map((l) => ({
      kind: "lead" as const,
      id: l.id,
      title: l.contactName,
      detail: l.company,
      href: `/leads/${l.id}`,
    })),
    ...projects.map((p) => ({
      kind: "project" as const,
      id: p.id,
      title: p.name,
      detail: p.client?.name ?? null,
      href: `/projects/${p.id}`,
    })),
    ...tasks.map((t) => ({
      kind: "task" as const,
      id: t.id,
      title: t.title,
      detail: t.project?.name ?? null,
      href: `/tasks/${t.id}`,
    })),
  ];
}
