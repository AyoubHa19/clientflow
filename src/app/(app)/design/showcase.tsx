"use client";

import { InboxIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const SWATCHES = [
  ["background", "bg-background"],
  ["card", "bg-card"],
  ["muted", "bg-muted"],
  ["primary", "bg-primary"],
  ["brand", "bg-brand"],
  ["brand-soft", "bg-brand-soft"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["destructive", "bg-destructive"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-start gap-3">{children}</CardContent>
    </Card>
  );
}

export function DesignShowcase() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <Section title="Colours">
        <ul className="grid w-full grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-3">
          {SWATCHES.map(([name, className]) => (
            <li key={name} className="flex flex-col gap-1.5">
              <span className={`h-12 rounded-lg ring-1 ring-border ${className}`} />
              <span className="text-xs text-muted-foreground">{name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Buttons">
        <Button>
          <PlusIcon aria-hidden data-icon="inline-start" />
          New client
        </Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Delete</Button>
        <Button variant="link">Link</Button>
        <Button disabled>Disabled</Button>
      </Section>

      <Section title="Form fields">
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <div className="grid content-start gap-2">
            <Label htmlFor="demo-name">Client name</Label>
            <Input id="demo-name" placeholder="Acme Studio (sample)" />
          </div>
          <div className="grid content-start gap-2">
            <Label htmlFor="demo-email">Email</Label>
            <Input
              id="demo-email"
              type="email"
              defaultValue="not-an-email"
              aria-invalid
              aria-describedby="demo-email-error"
            />
            <p id="demo-email-error" className="text-sm text-destructive">
              Enter a valid email address.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Badges">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Overdue</Badge>
      </Section>

      <Section title="Feedback">
        <Button variant="outline" onClick={() => toast.success("Client saved (sample)")}>
          Show a toast
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open a dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this client?</DialogTitle>
              <DialogDescription>
                This is a sample. In the app, destructive actions always ask first.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructive">Delete</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      <Section title="Loading and empty">
        <div className="grid w-full gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3" aria-hidden>
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <EmptyState
            icon={InboxIcon}
            title="No clients yet"
            description="Add your first client to see them here."
            action={<Button size="sm">Add a client</Button>}
          />
        </div>
      </Section>

      <p className="text-sm text-muted-foreground">
        Colours are tokens in src/app/globals.css; run node scripts/contrast.mjs after changing one.
      </p>
    </div>
  );
}
