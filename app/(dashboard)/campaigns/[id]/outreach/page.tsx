"use client";

import { useParams } from "next/navigation";
import { OutreachPageClient } from "@/components/outreach/outreach-page-client";

export default function CampaignOutreachPage() {
  const params = useParams();
  const campaignId = params.id as string;

  // TODO: Pass campaignId to OutreachPageClient to scope messages
  return <OutreachPageClient />;
}
