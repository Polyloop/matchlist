"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Rocket01Icon,
  AlertCircleIcon,
  InformationCircleIcon,
  Alert02Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { IconSvgElement } from "@hugeicons/react";

const typeConfig: Record<string, { icon: IconSvgElement; accent: string; bg: string }> = {
  opportunity: { icon: Rocket01Icon, accent: "text-emerald-600", bg: "bg-emerald-50" },
  action_needed: { icon: AlertCircleIcon, accent: "text-amber-600", bg: "bg-amber-50" },
  insight: { icon: InformationCircleIcon, accent: "text-blue-600", bg: "bg-blue-50" },
  warning: { icon: Alert02Icon, accent: "text-red-600", bg: "bg-red-50" },
};

export function SignalsPanel() {
  const signals = useQuery(api.analytics.signals.getSignals);

  if (!signals || signals.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Signals</h2>
      <div className="flex flex-col gap-3">
        {signals.map((signal) => {
          const config = typeConfig[signal.type] || typeConfig.insight;
          const content = (
            <Card className={cn("transition-all duration-150", signal.href && "hover:shadow-sm hover:-translate-y-px")}>
              <CardContent className="flex items-start gap-3 !p-3">
                <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", config.bg, config.accent)}>
                  <HugeiconsIcon icon={config.icon} strokeWidth={1.5} className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{signal.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{signal.description}</p>
                </div>
                {signal.href && (
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.5} className="size-3.5 shrink-0 text-muted-foreground/40 mt-0.5" />
                )}
              </CardContent>
            </Card>
          );

          if (signal.href) {
            return (
              <Link key={signal.id} href={signal.href}>
                {content}
              </Link>
            );
          }

          return <div key={signal.id}>{content}</div>;
        })}
      </div>
    </div>
  );
}
