"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserIcon,
  Rocket01Icon,
  MailSend01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

export function WelcomeHero() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center">
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome to Scout
        </h1>
        <p className="mt-3 text-base text-muted-foreground leading-relaxed">
          Your AI-powered outreach platform for non-profits. Find the right people, generate personalised messages, and automate your outreach — all in one place.
        </p>

        <Button size="lg" render={<Link href="/settings" />} className="mt-8">
          Get Started
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.5} className="ml-1.5 size-4" />
        </Button>

        <div className="mt-12 grid grid-cols-3 gap-6">
          <StepPreview
            number={1}
            icon={UserIcon}
            label="Set up profile"
            description="Your sender identity"
          />
          <StepPreview
            number={2}
            icon={Rocket01Icon}
            label="Create campaign"
            description="Pick a template"
          />
          <StepPreview
            number={3}
            icon={MailSend01Icon}
            label="Watch the magic"
            description="AI writes your emails"
          />
        </div>

        <p className="mt-8 text-xs text-muted-foreground/60">
          Takes about 5 minutes to get your first campaign running
        </p>
      </div>
    </div>
  );
}

function StepPreview({
  number,
  icon,
  label,
  description,
}: {
  number: number;
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  label: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex size-10 items-center justify-center rounded-full border-2 border-border text-muted-foreground">
        <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-4" />
      </div>
      <div>
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
