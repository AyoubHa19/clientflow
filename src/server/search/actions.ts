"use server";

// The search box (Ctrl+K). The workspace comes from the session, never from
// the browser; the text is cleaned and limited in the service.

import { db } from "@/server/db";
import { requireWorkspace } from "@/server/workspace/context";
import { searchWorkspace, type SearchHit } from "./service";

export async function searchAction(query: unknown): Promise<SearchHit[]> {
  const ctx = await requireWorkspace();
  return searchWorkspace(db, ctx, query);
}
