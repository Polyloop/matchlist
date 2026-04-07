"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CAMPAIGN_TYPE_CONFIGS } from "@/lib/campaigns/types";
import type { CampaignType, CampaignStatus } from "@/lib/supabase/types";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  GiftIcon,
  Search01Icon,
  Building06Icon,
  UserGroupIcon,
  PackageIcon,
  FolderLibraryIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

const campaignIcons: Record<string, IconSvgElement> = {
  gift: GiftIcon,
  search: Search01Icon,
  building: Building06Icon,
  people: UserGroupIcon,
  package: PackageIcon,
};

interface CampaignRow {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  description: string | null;
  prospect_count: number;
  created_at: string;
}

function statusVariant(status: CampaignStatus) {
  switch (status) {
    case "active": return "default" as const;
    case "draft": return "outline" as const;
    case "completed": return "secondary" as const;
    case "archived": return "secondary" as const;
    default: return "outline" as const;
  }
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const draftCampaigns = campaigns.filter((c) => c.status === "draft");
  const archivedCampaigns = campaigns.filter((c) => c.status === "archived" || c.status === "completed");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Manage your outreach campaigns across different use cases
          </p>
        </div>
        <Button render={<Link href="/campaigns/new" />}>
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={1.5} className="mr-1.5 size-3.5" />
          New Campaign
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <HugeiconsIcon icon={FolderLibraryIcon} strokeWidth={1.5} className="size-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-medium">No campaigns yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first campaign to start finding opportunities and
              generating outreach
            </p>
          </div>
          <Button render={<Link href="/campaigns/new" />}>
            Create Your First Campaign
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {activeCampaigns.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Active ({activeCampaigns.length})
              </h2>
              <CampaignGrid campaigns={activeCampaigns} />
            </section>
          )}
          {draftCampaigns.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Drafts ({draftCampaigns.length})
              </h2>
              <CampaignGrid campaigns={draftCampaigns} />
            </section>
          )}
          {archivedCampaigns.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Archived ({archivedCampaigns.length})
              </h2>
              <CampaignGrid campaigns={archivedCampaigns} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function CampaignGrid({ campaigns }: { campaigns: CampaignRow[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => {
        const config = CAMPAIGN_TYPE_CONFIGS[campaign.type];
        const icon = campaignIcons[config?.icon || "gift"] || GiftIcon;

        return (
          <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
            <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
              <CardContent>
                <div className="flex items-start gap-3">
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted ${config?.color || ""}`}>
                    <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-medium">{campaign.name}</h3>
                      <Badge variant={statusVariant(campaign.status)} className="shrink-0 text-xs">
                        {campaign.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {config?.label || campaign.type}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {campaign.prospect_count} prospect{campaign.prospect_count !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
