"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SendCalendar } from "@/components/dashboard/send-calendar";
import type { Id } from "@/convex/_generated/dataModel";

export default function CampaignSchedulePage() {
  const params = useParams();
  const campaignId = params.id as Id<"campaigns">;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Scheduled Sends</CardTitle>
        </CardHeader>
        <CardContent>
          <SendCalendar campaignId={campaignId} />
        </CardContent>
      </Card>
    </div>
  );
}
