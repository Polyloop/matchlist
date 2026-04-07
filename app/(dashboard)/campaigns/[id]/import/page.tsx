"use client";

import { useParams } from "next/navigation";
import { CsvUpload } from "@/components/csv-upload";

export default function CampaignImportPage() {
  const params = useParams();
  const campaignId = params.id as string;

  return <CsvUpload campaignId={campaignId} />;
}
