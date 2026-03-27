import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardsProps {
  totalProspects: number;
  enriched: number;
  matchEligible: number;
  messagesSent: number;
  estimatedMatchValue: number;
}

export function StatsCards({
  totalProspects,
  enriched,
  matchEligible,
  messagesSent,
  estimatedMatchValue,
}: StatsCardsProps) {
  const stats = [
    { title: "Total Prospects", value: totalProspects },
    { title: "Enriched", value: enriched },
    { title: "Match Eligible", value: matchEligible },
    { title: "Messages Sent", value: messagesSent },
    {
      title: "Est. Match Value",
      value: `$${estimatedMatchValue.toLocaleString()}`,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
