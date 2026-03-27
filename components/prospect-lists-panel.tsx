"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProspectList {
  id: string;
  name: string;
  prospect_count: number;
}

interface ProspectListsPanelProps {
  selectedListId: string | null;
  onSelectList: (listId: string | null) => void;
}

export function ProspectListsPanel({
  selectedListId,
  onSelectList,
}: ProspectListsPanelProps) {
  const [lists, setLists] = useState<ProspectList[]>([]);
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadLists() {
    const res = await fetch("/api/lists");
    if (res.ok) {
      setLists(await res.json());
    }
  }

  useEffect(() => {
    loadLists();
  }, []);

  async function handleCreateList() {
    if (!newListName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName.trim() }),
      });
      if (res.ok) {
        setNewListName("");
        toast.success("List created");
        await loadLists();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create list");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="w-48 shrink-0 space-y-3">
      <h3 className="text-sm font-medium">Lists</h3>

      <button
        onClick={() => onSelectList(null)}
        className={cn(
          "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
          selectedListId === null
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted",
        )}
      >
        All Prospects
      </button>

      {lists.map((list) => (
        <button
          key={list.id}
          onClick={() => onSelectList(list.id)}
          className={cn(
            "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
            selectedListId === list.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <span className="truncate">{list.name}</span>
          <Badge variant="secondary" className="ml-1 text-xs">
            {list.prospect_count}
          </Badge>
        </button>
      ))}

      <Separator />

      <div className="space-y-1.5">
        <Input
          placeholder="New list name"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
          className="text-sm"
        />
        <Button
          size="sm"
          onClick={handleCreateList}
          disabled={creating || !newListName.trim()}
          className="w-full"
        >
          {creating ? "Creating..." : "Create List"}
        </Button>
      </div>
    </div>
  );
}
