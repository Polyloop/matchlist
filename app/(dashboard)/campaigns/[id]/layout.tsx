"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CAMPAIGN_TYPE_CONFIGS } from "@/lib/campaigns/types";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GiftIcon,
  Search01Icon,
  Building06Icon,
  UserGroupIcon,
  PackageIcon,
  ArrowLeft01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import type { CampaignType, CampaignStatus } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";

const campaignIcons: Record<string, IconSvgElement> = {
  gift: GiftIcon,
  search: Search01Icon,
  building: Building06Icon,
  people: UserGroupIcon,
  package: PackageIcon,
};

function statusVariant(status: CampaignStatus) {
  switch (status) {
    case "active": return "default" as const;
    case "draft": return "outline" as const;
    case "completed": return "secondary" as const;
    case "archived": return "secondary" as const;
    default: return "outline" as const;
  }
}

interface CampaignData {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  description: string | null;
  prospect_count: number;
}

export default function CampaignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const campaignId = params.id as string;
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      if (res.ok) {
        const data = await res.json();
        setCampaign(data.campaign);
      }
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  // Determine active tab from pathname
  const basePath = `/campaigns/${campaignId}`;
  let activeTab = "table";
  if (pathname.endsWith("/import")) activeTab = "import";
  else if (pathname.endsWith("/outreach")) activeTab = "outreach";
  else if (pathname.endsWith("/settings")) activeTab = "settings";

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg font-medium">Campaign not found</p>
        <Button variant="outline" render={<Link href="/campaigns" />}>
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const config = CAMPAIGN_TYPE_CONFIGS[campaign.type];
  const icon = campaignIcons[config?.icon || "gift"] || GiftIcon;

  return (
    <div className="space-y-6">
      {/* Campaign Header */}
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/campaigns" />} className="mb-3">
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.5} className="mr-1 size-3.5" />
          All Campaigns
        </Button>
        <div className="flex items-center gap-3">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted ${config?.color || ""}`}>
            <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
              <Badge variant={statusVariant(campaign.status)}>{campaign.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {config?.label} &middot; {campaign.prospect_count} prospect{campaign.prospect_count !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab}>
        <TabsList>
          <TabsTrigger value="table" render={<Link href={basePath} />}>
            Table
          </TabsTrigger>
          <TabsTrigger value="import" render={<Link href={`${basePath}/import`} />}>
            Import
          </TabsTrigger>
          <TabsTrigger value="outreach" render={<Link href={`${basePath}/outreach`} />}>
            Outreach
          </TabsTrigger>
          <TabsTrigger value="settings" render={<Link href={`${basePath}/settings`} />}>
            Settings
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Page Content */}
      {children}
    </div>
  );
}
