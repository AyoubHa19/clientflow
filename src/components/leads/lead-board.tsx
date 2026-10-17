"use client";

import { useId, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { EllipsisIcon, GripVerticalIcon, UserCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isOpenLead, type FollowUpState } from "@/lib/followups";
import { LEAD_STATUS_LABELS, LEAD_STATUSES, type LeadStatus } from "@/lib/validation/lead";
import { cn } from "@/lib/utils";
import { FollowUpBadge } from "./follow-up-badge";
import { setLeadStatusAction } from "@/server/leads/actions";

export type BoardLead = {
  id: string;
  contactName: string;
  company: string | null;
  source: string | null;
  updated: string;
  converted: boolean;
  /** Where its follow-up stands, worked out on the server for today. */
  followUp: FollowUpState | null;
};

export type BoardColumnData = {
  status: LeadStatus;
  total: number;
  items: BoardLead[];
  seeAllHref: string;
};

type Move = { id: string; to: LeadStatus };

/** The board after moving one lead: out of its column, to the top of `to`. */

/** A coloured dot per stage, so the columns read at a glance. */
const STATUS_DOT: Record<LeadStatus, string> = {
  NEW: "bg-chart-5",
  CONTACTED: "bg-chart-2",
  QUALIFIED: "bg-brand",
  WON: "bg-success",
  LOST: "bg-destructive/60",
};

function applyMove(columns: BoardColumnData[], { id, to }: Move): BoardColumnData[] {
  const from = columns.find((column) => column.items.some((lead) => lead.id === id));
  const lead = from?.items.find((item) => item.id === id);
  if (!from || !lead || from.status === to) return columns;
  return columns.map((column) => {
    if (column.status === from.status) {
      return {
        ...column,
        total: column.total - 1,
        items: column.items.filter((item) => item.id !== id),
      };
    }
    if (column.status === to) {
      return { ...column, total: column.total + 1, items: [lead, ...column.items] };
    }
    return column;
  });
}

/**
 * Left and right arrows jump the picked-up card to the next column (the
 * default moves it a few pixels at a time).
 */
const columnCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  if (event.code !== "ArrowRight" && event.code !== "ArrowLeft") return undefined;
  event.preventDefault();
  const { active, over, droppableRects } = context;
  const current = (over?.id ?? active?.data.current?.status) as LeadStatus | undefined;
  const index = current ? LEAD_STATUSES.indexOf(current) : 0;
  const step = event.code === "ArrowRight" ? 1 : -1;
  const nextIndex = Math.min(Math.max(index + step, 0), LEAD_STATUSES.length - 1);
  const rect = droppableRects.get(LEAD_STATUSES[nextIndex]!);
  if (!rect) return undefined;
  return { x: rect.left + 8, y: rect.top + 48 };
};

// The pointer decides when there is one; the keyboard falls back to overlap.
const collisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  return pointer.length > 0 ? pointer : rectIntersection(args);
};

const columnName = (id: unknown) => LEAD_STATUS_LABELS[id as LeadStatus] ?? String(id);

/** The pipeline. Cards move by drag (mouse, touch, keyboard) or a menu. */
export function LeadBoard({ columns }: { columns: BoardColumnData[] }) {
  const [board, moveOptimistically] = useOptimistic(columns, applyMove);
  const [saving, startTransition] = useTransition();
  const [dragging, setDragging] = useState<BoardLead | null>(null);
  const instructionsId = useId();
  // A stable id, so dnd-kit's accessibility ids match between server and browser.
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnCoordinates }),
  );

  const nameOf = (id: unknown) =>
    board.flatMap((column) => column.items).find((lead) => lead.id === id)?.contactName ?? "Lead";

  // Moves are saved one after another, in the order they were made, so
  // two quick moves can't overtake (or cancel) each other.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  function move(lead: BoardLead, to: LeadStatus) {
    startTransition(async () => {
      moveOptimistically({ id: lead.id, to });
      const saved = queue.current.then(() => setLeadStatusAction(lead.id, to));
      queue.current = saved.catch(() => undefined);
      const result = await saved;
      // On failure the optimistic move simply ends: the card goes back.
      if (!result.ok) toast.error(result.message);
    });
  }

  function onDragStart({ active }: DragStartEvent) {
    setDragging(
      board.flatMap((column) => column.items).find((lead) => lead.id === active.id) ?? null,
    );
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
    const lead = board.flatMap((column) => column.items).find((item) => item.id === active.id);
    const to = over?.id as LeadStatus | undefined;
    if (!lead || !to || active.data.current?.status === to) return;
    move(lead, to);
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${nameOf(active.id)}. Use the left and right arrow keys to choose a column, space to drop, escape to cancel.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} is over ${columnName(over.id)}.`
        : `${nameOf(active.id)} is not over a column.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} moved to ${columnName(over.id)}.`
        : `${nameOf(active.id)} was put back.`,
    onDragCancel: ({ active }) =>
      `Moving ${nameOf(active.id)} was cancelled. It stays where it was.`,
  };

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "To move this lead, press space or enter, choose a column with the left and right arrow keys, then press space or enter to drop it. Escape cancels.",
        },
      }}
    >
      <p id={instructionsId} className="sr-only">
        Each lead also has a menu to move it without dragging.
      </p>
      <div
        data-board
        aria-busy={saving}
        className="relative -mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
      >
        <div className="grid min-w-max auto-cols-[minmax(13rem,1fr)] grid-flow-col gap-3 lg:min-w-0">
          {board.map((column) => (
            <BoardColumn key={column.status} column={column} onMove={move} />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {dragging ? <CardBody lead={dragging} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumn({
  column,
  onMove,
}: {
  column: BoardColumnData;
  onMove: (lead: BoardLead, to: LeadStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });
  const headingId = useId();
  const label = LEAD_STATUS_LABELS[column.status];

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={headingId}
      data-status={column.status}
      className={cn(
        "flex min-h-48 flex-col gap-2 surface p-2 transition-colors",
        isOver && "border-ring! bg-brand-soft/70!",
      )}
    >
      <header className="flex items-center justify-between px-1.5 pt-1">
        <h2 id={headingId} className="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[column.status])} />
          {label}
        </h2>
        <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
          <span className="sr-only">{column.total === 1 ? "1 lead" : `${column.total} leads`}</span>
          <span aria-hidden>{column.total}</span>
        </span>
      </header>
      {column.items.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          No leads here
        </p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2" aria-label={`${label} leads`}>
          {column.items.map((lead) => (
            <LeadCard key={lead.id} lead={lead} status={column.status} onMove={onMove} />
          ))}
        </ul>
      )}
      {column.total > column.items.length && (
        <Link
          href={column.seeAllHref}
          className="px-1.5 py-1 text-xs font-medium text-brand underline-offset-4 hover:underline"
        >
          See all {column.total} in the list
        </Link>
      )}
    </section>
  );
}

function LeadCard({
  lead,
  status,
  onMove,
}: {
  lead: BoardLead;
  status: LeadStatus;
  onMove: (lead: BoardLead, to: LeadStatus) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { status },
    disabled: lead.converted,
  });

  return (
    <li ref={setNodeRef} className={cn(isDragging && "opacity-40")}>
      <CardBody
        lead={lead}
        handle={
          lead.converted ? null : (
            <button
              ref={setActivatorNodeRef}
              type="button"
              {...listeners}
              {...attributes}
              aria-label={`Drag ${lead.contactName}`}
              className="-ml-1 flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
            >
              <GripVerticalIcon aria-hidden className="size-4" />
            </button>
          )
        }
        menu={<MoveMenu lead={lead} status={status} onMove={onMove} />}
        open={isOpenLead(status)}
      />
    </li>
  );
}

function CardBody({
  lead,
  handle,
  menu,
  overlay = false,
  open = true,
}: {
  lead: BoardLead;
  handle?: React.ReactNode;
  menu?: React.ReactNode;
  overlay?: boolean;
  /** In an open column: a card moved to Won or Lost drops its follow-up. */
  open?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-(--surface-edge) bg-(--surface-fill) p-3 text-sm shadow-(--shadow-card) transition duration-200 hover:-translate-y-0.5",
        overlay && "w-60 rotate-1 shadow-lg ring-2 ring-ring/40",
      )}
    >
      <div className="flex items-start gap-1.5">
        {handle}
        <div className="min-w-0 flex-1">
          {overlay ? (
            <p className="truncate font-medium">{lead.contactName}</p>
          ) : (
            <Link
              href={`/leads/${lead.id}`}
              className="block truncate font-medium underline-offset-4 hover:underline"
            >
              {lead.contactName}
            </Link>
          )}
          {lead.company && <p className="truncate text-xs text-muted-foreground">{lead.company}</p>}
        </div>
        {menu}
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {lead.converted && (
          <span className="inline-flex items-center gap-1 font-medium text-success">
            <UserCheckIcon aria-hidden className="size-3.5" />
            Client
          </span>
        )}
        {lead.source && <span>{lead.source}</span>}
        <span>Updated {lead.updated}</span>
      </p>
      {open && <FollowUpBadge state={lead.followUp} showScheduled={false} className="mt-2" />}
    </div>
  );
}

function MoveMenu({
  lead,
  status,
  onMove,
}: {
  lead: BoardLead;
  status: LeadStatus;
  onMove: (lead: BoardLead, to: LeadStatus) => void;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="-mr-1 shrink-0">
          <EllipsisIcon aria-hidden />
          <span className="sr-only">Move {lead.contactName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Move to</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {lead.converted ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            This lead became a client, so it stays Won.
          </p>
        ) : (
          <DropdownMenuRadioGroup
            value={status}
            onValueChange={(value) => onMove(lead, value as LeadStatus)}
          >
            {LEAD_STATUSES.map((value) => (
              <DropdownMenuRadioItem key={value} value={value}>
                {LEAD_STATUS_LABELS[value]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
