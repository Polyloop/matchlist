"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  UserGroupIcon,
  MailSend01Icon,
  Setting06Icon,
  TargetIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const mainNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardSquare01Icon },
  { label: "Prospects", href: "/prospects", icon: UserGroupIcon },
  { label: "Outreach", href: "/outreach", icon: MailSend01Icon },
];

const bottomNavItems = [
  { label: "Settings", href: "/settings", icon: Setting06Icon },
];

export function AppSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar p-4">
      <div className="mb-6">
        <Link href="/dashboard" className="flex items-center gap-2 px-2">
          <HugeiconsIcon
            icon={TargetIcon}
            strokeWidth={1.5}
            className="size-5 text-primary"
          />
          <span className="text-base font-semibold tracking-tight">
            MatchList
          </span>
        </Link>
      </div>

      <Separator className="mb-4" />

      <nav className="flex flex-1 flex-col">
        <div className="flex flex-col gap-0.5">
          {mainNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "border-l-2 border-primary bg-primary/10 pl-2 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <HugeiconsIcon
                  icon={item.icon}
                  strokeWidth={1.5}
                  className="size-4"
                />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col gap-0.5">
          {bottomNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "border-l-2 border-primary bg-primary/10 pl-2 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <HugeiconsIcon
                  icon={item.icon}
                  strokeWidth={1.5}
                  className="size-4"
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
