"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CAMPAIGN_TYPE_CONFIGS, CAMPAIGN_TYPES } from "@/lib/campaigns/types";
import type { CampaignType } from "@/lib/supabase/types";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GiftIcon,
  Search01Icon,
  Building06Icon,
  UserGroupIcon,
  PackageIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

const campaignIcons: Record<string, IconSvgElement> = {
  gift: GiftIcon,
  search: Search01Icon,
  building: Building06Icon,
  people: UserGroupIcon,
  package: PackageIcon,
};

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<CampaignType | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!selectedType || !name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type: selectedType,
          description: description.trim() || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Campaign created");
        router.push(`/campaigns/${data.campaign.id}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create campaign");
      }
    } catch {
      toast.error("Failed to create campaign");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/campaigns")}>
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.5} className="mr-1 size-3.5" />
          Back to Campaigns
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Campaign</h1>
        <p className="text-sm text-muted-foreground">
          Step {step} of 3
        </p>
      </div>

      {/* Step 1: Choose Type */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">What type of campaign?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {CAMPAIGN_TYPES.map((type) => {
              const config = CAMPAIGN_TYPE_CONFIGS[type];
              const icon = campaignIcons[config.icon] || GiftIcon;
              const isSelected = selectedType === type;

              return (
                <Card
                  key={type}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-md",
                    isSelected && "ring-2 ring-primary shadow-md",
                  )}
                  onClick={() => setSelectedType(type)}
                >
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted",
                        !isSelected && config.color,
                      )}>
                        <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">{config.label}</h3>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          {config.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedType}
            >
              Continue
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.5} className="ml-1 size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Name & Description */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Name your campaign</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Campaign Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`e.g. Q2 ${CAMPAIGN_TYPE_CONFIGS[selectedType!]?.label}`}
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this campaign's goals..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.5} className="mr-1 size-3.5" />
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!name.trim()}
            >
              Continue
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={1.5} className="ml-1 size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && selectedType && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Review & Create</h2>
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground",
                )}>
                  <HugeiconsIcon
                    icon={campaignIcons[CAMPAIGN_TYPE_CONFIGS[selectedType].icon] || GiftIcon}
                    strokeWidth={1.5}
                    className="size-5"
                  />
                </div>
                <div>
                  <h3 className="font-medium">{name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {CAMPAIGN_TYPE_CONFIGS[selectedType].label}
                  </p>
                </div>
              </div>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
              <div>
                <h4 className="mb-2 text-sm font-medium">Default Enrichment Pipeline</h4>
                <div className="flex flex-wrap gap-2">
                  {CAMPAIGN_TYPE_CONFIGS[selectedType].defaultEnrichments.map((e, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {i + 1}. {e.enrichment_type.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.5} className="mr-1 size-3.5" />
              Back
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
