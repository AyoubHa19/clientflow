"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { initials } from "@/lib/initials";

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
    >
      {initials(name)}
    </span>
  );
}

export function UserMenu({
  name,
  email,
  showDetails = false,
}: {
  name: string;
  email: string;
  /** Show the name and email beside the picture (the side bar has room). */
  showDetails?: boolean;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    const { error } = await authClient.signOut();
    if (error) {
      setSigningOut(false);
      toast.error("Couldn't sign out. Please try again.");
      return;
    }
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    // Not modal: a menu needn't hide the rest of the page from screen readers.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {showDetails ? (
          <Button
            variant="ghost"
            className="h-auto w-full justify-start gap-3 px-2 py-2 text-left hover:bg-sidebar-accent"
          >
            <Avatar name={name} />
            {/* The visible text is the name for screen readers too. */}
            <span className="sr-only">Account: </span>
            <span className="grid min-w-0 flex-1">
              <span className="truncate text-sm font-medium">{name}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
            </span>
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar name={name} />
            {/* Named by hidden text, not aria-label, as the initials show. */}
            <span className="sr-only">Account: {name}</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={showDetails ? "start" : "end"}
        side={showDetails ? "top" : "bottom"}
        className="w-60"
      >
        <DropdownMenuLabel className="grid gap-0.5 py-2 font-normal">
          <span className="truncate text-sm font-medium text-foreground">{name}</span>
          <span className="truncate text-xs text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={signingOut}
          onSelect={(event) => {
            event.preventDefault();
            void signOut();
          }}
        >
          <LogOutIcon aria-hidden />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
