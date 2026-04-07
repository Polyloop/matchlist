"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  UserGroupIcon,
  MailSend01Icon,
  Setting06Icon,
  TargetIcon,
  PlusSignIcon,
  GiftIcon,
  Search01Icon,
  Building06Icon,
  PackageIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import type { CampaignType } from "@/lib/supabase/types";

const mainNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardSquare01Icon },
  { label: "Prospects", href: "/prospects", icon: UserGroupIcon },
  { label: "Outreach", href: "/outreach", icon: MailSend01Icon },
];

const campaignIcons: Record<string, IconSvgElement> = {
  gift: GiftIcon,
  search: Search01Icon,
  building: Building06Icon,
  people: UserGroupIcon,
  package: PackageIcon,
};

const typeToIcon: Record<CampaignType, string> = {
  donation_matching: "gift",
  grant_research: "search",
  corporate_sponsorship: "building",
  volunteer_matching: "people",
  in_kind_donation: "package",
};

interface SidebarCampaign {
  id: string;
  name: string;
  type: CampaignType;
  status: string;
}

export function AppSidebar() {
  const pathname = usePathname();
  const [campaigns, setCampaigns] = useState<SidebarCampaign[]>([]);

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(
          (data.campaigns ?? []).filter(
            (c: SidebarCampaign) => c.status === "active" || c.status === "draft",
          ),
        );
      }
    } catch {
      // Silently fail — sidebar should not break the page
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <HugeiconsIcon icon={TargetIcon} strokeWidth={1.5} className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">MatchList</span>
                <span className="truncate text-xs text-muted-foreground">
                  Non-profit outreach
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                  >
                    <HugeiconsIcon icon={item.icon} strokeWidth={1.5} className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Campaigns</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {campaigns.map((campaign) => {
                const iconKey = typeToIcon[campaign.type] || "gift";
                const icon = campaignIcons[iconKey] || GiftIcon;
                return (
                  <SidebarMenuItem key={campaign.id}>
                    <SidebarMenuButton
                      render={<Link href={`/campaigns/${campaign.id}`} />}
                      isActive={isActive(`/campaigns/${campaign.id}`)}
                      tooltip={campaign.name}
                    >
                      <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-4" />
                      <span className="truncate">{campaign.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/campaigns/new" />}
                  isActive={isActive("/campaigns/new")}
                  tooltip="New Campaign"
                >
                  <HugeiconsIcon icon={PlusSignIcon} strokeWidth={1.5} className="size-4" />
                  <span className="text-muted-foreground">New Campaign</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/settings" />}
              isActive={isActive("/settings")}
              tooltip="Settings"
            >
              <HugeiconsIcon icon={Setting06Icon} strokeWidth={1.5} className="size-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
