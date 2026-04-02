import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroupIcon,
  SparklesIcon,
  TargetIcon,
  MailSend01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

interface StatsCardsProps {
  totalProspects: number;
  enriched: number;
  matchEligible: number;
  messagesSent: number;
}

export function StatsCards({
  totalProspects,
  enriched,
  matchEligible,
  messagesSent,
}: StatsCardsProps) {
  const stats = [
    {
      title: "Total Prospects",
      value: totalProspects,
      icon: UserGroupIcon,
      highlight: false,
    },
    {
      title: "Enriched",
      value: enriched,
      icon: SparklesIcon,
      highlight: false,
    },
    {
      title: "Match Eligible",
      value: matchEligible,
      icon: TargetIcon,
      highlight: true,
    },
    {
      title: "Messages Sent",
      value: messagesSent,
      icon: MailSend01Icon,
      highlight: false,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className={cn(stat.highlight && "ring-1 ring-accent/20")}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={stat.icon}
                strokeWidth={1.5}
                className="size-4 text-muted-foreground"
              />
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
