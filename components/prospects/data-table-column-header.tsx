"use client";

import type { Column } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  ArrowMoveUpLeftIcon,
} from "@hugeicons/core-free-icons";

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <button
      className={cn(
        "flex items-center gap-1 hover:text-foreground -ml-2 px-2 py-1 rounded-md transition-colors",
        className,
      )}
      onClick={() => column.toggleSorting()}
    >
      {title}
      {column.getIsSorted() === "desc" ? (
        <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={1.5} className="size-3.5" />
      ) : column.getIsSorted() === "asc" ? (
        <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={1.5} className="size-3.5" />
      ) : (
        <HugeiconsIcon icon={ArrowMoveUpLeftIcon} strokeWidth={1.5} className="size-3.5 opacity-30" />
      )}
    </button>
  );
}
