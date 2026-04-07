"use client";

import type { Table } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Setting06Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";

const matchOptions = [
  { label: "Eligible", value: "true" },
  { label: "Not Eligible", value: "false" },
];

const stageOptions = [
  { label: "Pending", value: "pending" },
  { label: "Scraped", value: "scraped" },
  { label: "Enriched", value: "enriched" },
  { label: "Matched", value: "matched" },
  { label: "Message Ready", value: "message_generated" },
  { label: "Sent", value: "sent" },
  { label: "Failed", value: "failed" },
];

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={1.5}
            className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search prospects..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="h-8 w-[200px] pl-9 lg:w-[280px]"
          />
        </div>
        {table.getColumn("match_eligible") && (
          <DataTableFacetedFilter
            column={table.getColumn("match_eligible")}
            title="Match"
            options={matchOptions}
          />
        )}
        {table.getColumn("stage") && (
          <DataTableFacetedFilter
            column={table.getColumn("stage")}
            title="Stage"
            options={stageOptions}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.5} className="ml-2 size-3.5" />
          </Button>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex" />}
        >
          <HugeiconsIcon icon={Setting06Icon} strokeWidth={1.5} className="mr-2 size-3.5" />
          View
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[150px]">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter(
                (column) =>
                  typeof column.accessorFn !== "undefined" && column.getCanHide(),
              )
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
