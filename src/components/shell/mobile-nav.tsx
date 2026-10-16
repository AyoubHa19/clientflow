"use client";

import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavLinks } from "./nav-links";

/** The menu button and slide-in navigation below the lg breakpoint. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <MenuIcon aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0">
        <SheetHeader className="px-4 pt-4 pb-5">
          <SheetTitle>
            <Logo />
          </SheetTitle>
          <SheetDescription className="sr-only">Main navigation</SheetDescription>
        </SheetHeader>
        <nav aria-label="Main" className="px-3">
          <NavLinks onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
