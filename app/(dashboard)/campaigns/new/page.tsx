"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CAMPAIGN_TYPE_CONFIGS, CAMPAIGN_TYPES } from "@/lib/campaigns/types";
import { CAMPAIGN_TEMPLATES, type CampaignTemplate } from "@/lib/campaigns/templates";
import type { CampaignType } from "@/lib/types";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GiftIcon,
  Search01Icon,
  Building06Icon,
  UserGroupIcon,
  PackageIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Rocket01Icon,
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
  const createCampaign = useMutation(api.campaigns.mutations.create);

  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [selectedType, setSelectedType] = useState<CampaignType | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  function selectTemplate(template: CampaignTemplate) {
    setSelectedTemplate(template);
    setSelectedType(template.campaignType);
    setName(template.name);
    setDescription(template.description);
    setStep(2);
  }

  function selectBlankType(type: CampaignType) {
    setSelectedTemplate(null);
    setSelectedType(type);
    setName("");
    setDescription("");
    setStep(2);
  }

  async function handleCreate() {
    if (!selectedType || !name.trim()) return;
    setCreating(true);
    try {
      const campaignId = await createCampaign({
        name: name.trim(),
        type: selectedType,
        description: description.trim() || undefined,
      });

      // TODO: Apply template settings + promptInstructions to campaignSettings

      toast.success("Campaign created");
      router.push(`/campaigns/${campaignId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => step === 1 ? router.push("/campaigns") : setStep(step - 1)}>
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={1.5} className="mr-1 size-3.5" />
          {step === 1 ? "Back to Campaigns" : "Back"}
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Campaign</h1>
        <p className="text-sm text-muted-foreground">Step {step} of 3</p>
      </div>

      {/* Step 1: Choose template or blank */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Templates */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Rocket01Icon} strokeWidth={1.5} className="size-4 text-primary" />
              <h2 className="text-sm font-medium">Start from a template</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {CAMPAIGN_TEMPLATES.map((template) => {
                const config = CAMPAIGN_TYPE_CONFIGS[template.campaignType];
                const icon = campaignIcons[config?.icon || "gift"] || GiftIcon;
                return (
                  <Card
                    key={template.id}
                    className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                    onClick={() => selectTemplate(template)}
                  >
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-md bg-muted", config?.color)}>
                            <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{template.name}</p>
                            <p className="text-[11px] text-muted-foreground">{config?.label}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {template.description}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[9px] h-4 px-1">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Blank types */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Or start blank</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {CAMPAIGN_TYPES.map((type) => {
                const config = CAMPAIGN_TYPE_CONFIGS[type];
                const icon = campaignIcons[config.icon] || GiftIcon;
                return (
                  <Card
                    key={type}
                    className="cursor-pointer transition-all duration-200 hover:shadow-md"
                    onClick={() => selectBlankType(type)}
                  >
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-md bg-muted", config.color)}>
                          <HugeiconsIcon icon={icon} strokeWidth={1.5} className="size-3.5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{config.label}</p>
                          <p className="text-[10px] text-muted-foreground">{config.description.slice(0, 60)}...</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Name & description */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Name your campaign</h2>
          {selectedTemplate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-[9px]">Template</Badge>
              {selectedTemplate.name}
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Campaign Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={selectedTemplate ? selectedTemplate.name : `e.g. Q2 ${CAMPAIGN_TYPE_CONFIGS[selectedType!]?.label}`}
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
          <div className="flex justify-end">
            <Button onClick={() => setStep(3)} disabled={!name.trim()}>
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
                <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground")}>
                  <HugeiconsIcon
                    icon={campaignIcons[CAMPAIGN_TYPE_CONFIGS[selectedType].icon] || GiftIcon}
                    strokeWidth={1.5}
                    className="size-5"
                  />
                </div>
                <div>
                  <h3 className="font-medium">{name}</h3>
                  <p className="text-xs text-muted-foreground">{CAMPAIGN_TYPE_CONFIGS[selectedType].label}</p>
                </div>
              </div>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
              {selectedTemplate && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Template Settings</h4>
                  <div className="space-y-1 text-xs">
                    {selectedTemplate.settings.followUpEnabled && (
                      <p>Follow-ups: {selectedTemplate.settings.followUpDelayDays}d delay, {selectedTemplate.settings.followUpMaxAttempts} max</p>
                    )}
                    {selectedTemplate.settings.confidenceThreshold && (
                      <p>Confidence threshold: {selectedTemplate.settings.confidenceThreshold}%</p>
                    )}
                    {selectedTemplate.settings.dailySendLimit && (
                      <p>Daily send limit: {selectedTemplate.settings.dailySendLimit}</p>
                    )}
                  </div>
                  {selectedTemplate.promptInstructions && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground">AI Instructions</h4>
                      <p className="mt-1 text-xs text-muted-foreground italic">
                        "{selectedTemplate.promptInstructions}"
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div>
                <h4 className="mb-2 text-xs font-medium text-muted-foreground">Enrichment Pipeline</h4>
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
