import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon: IconSvgElement;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <HugeiconsIcon
          icon={icon}
          strokeWidth={1.5}
          className="size-8 text-muted-foreground"
        />
      </div>
      <div>
        <p className="text-lg font-medium">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {actionLabel && actionHref && (
        <Button render={<Link href={actionHref} />}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
