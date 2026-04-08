"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  complete: boolean;
  href: string;
  cta: string;
}

interface ChecklistProps {
  steps: OnboardingStep[];
  completedSteps: number;
  totalSteps: number;
}

export function OnboardingChecklist({ steps, completedSteps, totalSteps }: ChecklistProps) {
  const dismiss = useMutation(api.onboarding.mutations.dismiss);
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <Card className="mb-6">
      <CardContent className="py-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium">Get started with MatchList</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete these steps to send your first AI-powered outreach
            </p>
          </div>
          <button
            onClick={() => dismiss()}
            className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.5} className="size-3.5" />
          </button>
        </div>

        <div className="space-y-1.5">
          {steps.map((step, i) => {
            const isNext = !step.complete && steps.slice(0, i).every((s) => s.complete);

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors",
                  step.complete && "opacity-50",
                  isNext && "bg-muted/40",
                )}
              >
                {/* Status icon */}
                <div className="shrink-0">
                  {step.complete ? (
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={1.5} className="size-4 text-emerald-500" />
                  ) : (
                    <div className={cn(
                      "size-4 rounded-full border-2",
                      isNext ? "border-primary" : "border-border",
                    )} />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className={cn("text-xs font-medium", step.complete && "line-through")}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{step.description}</p>
                </div>

                {/* Action */}
                {!step.complete && (
                  <Button
                    variant={isNext ? "default" : "outline"}
                    size="xs"
                    render={<Link href={step.href} />}
                  >
                    {step.cta}
                    <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.5} className="ml-1 size-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {completedSteps}/{totalSteps}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
