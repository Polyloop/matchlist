"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  UserGroupIcon,
  MailSend01Icon,
  Setting06Icon,
  Upload04Icon,
  FolderLibraryIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    [],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
            <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={1.5} className="mr-2 size-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/review"))}>
            <HugeiconsIcon icon={MailSend01Icon} strokeWidth={1.5} className="mr-2 size-4" />
            Review Messages
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
            <HugeiconsIcon icon={Setting06Icon} strokeWidth={1.5} className="mr-2 size-4" />
            Settings
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(() => router.push("/campaigns/new"))}>
            <HugeiconsIcon icon={Upload04Icon} strokeWidth={1.5} className="mr-2 size-4" />
            New Campaign & Import
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/campaigns/new"))}>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={1.5} className="mr-2 size-4" />
            New Campaign
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/campaigns"))}>
            <HugeiconsIcon icon={FolderLibraryIcon} strokeWidth={1.5} className="mr-2 size-4" />
            All Campaigns
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
