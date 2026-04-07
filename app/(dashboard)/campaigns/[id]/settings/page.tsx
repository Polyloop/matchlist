"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { CampaignStatus } from "@/lib/types";
import type { Id } from "@/convex/_generated/dataModel";
import { HugeiconsIcon } from "@hugeicons/react";
import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";

export default function CampaignSettingsPage() {
  const params = useParams();
  const campaignId = params.id as Id<"campaigns">;

  const campaign = useQuery(api.campaigns.queries.get, { id: campaignId });
  const settings = useQuery(api.campaigns.queries.getSettings, { campaignId });
  const updateCampaign = useMutation(api.campaigns.mutations.update);
  const updateSettings = useMutation(api.campaigns.mutations.updateSettings);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<CampaignStatus>("active");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (campaign) {
      setName(campaign.name);
      setDescription(campaign.description || "");
      setStatus(campaign.status);
    }
  }, [campaign]);

  async function handleSaveCampaign() {
    setSaving(true);
    try {
      await updateCampaign({ id: campaignId, name, description: description || undefined, status });
      toast.success("Campaign updated");
    } catch { toast.error("Failed to update"); }
    finally { setSaving(false); }
  }

  async function handleTogglePause() {
    if (!settings) return;
    try {
      await updateSettings({ campaignId, paused: !settings.paused });
      toast.success(settings.paused ? "Campaign resumed" : "Campaign paused");
    } catch { toast.error("Failed to update"); }
  }

  async function handleSettingChange(key: string, value: unknown) {
    try {
      await updateSettings({ campaignId, [key]: value });
    } catch { toast.error("Failed to update"); }
  }

  if (!campaign) return null;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Kill switch */}
      {settings?.paused && (
        <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Campaign paused</p>
              <p className="text-xs text-amber-600/70 dark:text-amber-500/70">No messages will be sent until resumed</p>
            </div>
            <Button size="sm" onClick={handleTogglePause}>
              <HugeiconsIcon icon={PlayIcon} strokeWidth={1.5} className="mr-1.5 size-3.5" />
              Resume
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Campaign details */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Campaign Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={2} />
          </div>
          <div>
            <label className="text-xs font-medium">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as CampaignStatus)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSaveCampaign} disabled={saving} size="sm">
            {saving ? "Saving..." : "Save"}
          </Button>
        </CardContent>
      </Card>

      {/* Auto-send settings */}
      {settings && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Auto-Send</CardTitle>
                <Badge variant={settings.autoSendEnabled ? "default" : "outline"}>
                  {settings.autoSendEnabled ? "On" : "Off"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={settings.autoSendEnabled}
                  onCheckedChange={(checked) => handleSettingChange("autoSendEnabled", !!checked)}
                />
                <div>
                  <p className="text-xs font-medium">Enable auto-send</p>
                  <p className="text-[11px] text-muted-foreground">
                    Messages above confidence threshold are sent automatically
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-xs font-medium">Confidence Threshold</label>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Messages below {settings.confidenceThreshold}% confidence are queued for review
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0} max={100}
                    value={settings.confidenceThreshold}
                    onChange={(e) => handleSettingChange("confidenceThreshold", Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>

            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Send Window</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium">Start Hour</label>
                  <Input
                    type="number" min={0} max={23}
                    value={settings.sendWindowStart}
                    onChange={(e) => handleSettingChange("sendWindowStart", Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">End Hour</label>
                  <Input
                    type="number" min={0} max={23}
                    value={settings.sendWindowEnd}
                    onChange={(e) => handleSettingChange("sendWindowEnd", Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Timezone</label>
                <Input
                  value={settings.sendTimezone}
                  onChange={(e) => handleSettingChange("sendTimezone", e.target.value)}
                  className="mt-1"
                  placeholder="Europe/London"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Daily Send Limit</label>
                <Input
                  type="number" min={1} max={200}
                  value={settings.dailySendLimit}
                  onChange={(e) => handleSettingChange("dailySendLimit", Number(e.target.value))}
                  className="mt-1 w-24"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">Max emails per day for this campaign</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Follow-ups</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={settings.followUpEnabled}
                  onCheckedChange={(checked) => handleSettingChange("followUpEnabled", !!checked)}
                />
                <div>
                  <p className="text-xs font-medium">Enable automatic follow-ups</p>
                  <p className="text-[11px] text-muted-foreground">
                    Send follow-up emails if no response received
                  </p>
                </div>
              </div>
              {settings.followUpEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium">Days before follow-up</label>
                    <Input
                      type="number" min={1} max={30}
                      value={settings.followUpDelayDays}
                      onChange={(e) => handleSettingChange("followUpDelayDays", Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Max follow-ups</label>
                    <Input
                      type="number" min={1} max={5}
                      value={settings.followUpMaxAttempts}
                      onChange={(e) => handleSettingChange("followUpMaxAttempts", Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Kill switch */}
          {!settings.paused && (
            <Card>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="text-xs font-medium">Pause Campaign</p>
                  <p className="text-[11px] text-muted-foreground">Stop all scheduled sends immediately</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleTogglePause}>
                  <HugeiconsIcon icon={PauseIcon} strokeWidth={1.5} className="mr-1.5 size-3.5" />
                  Pause
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
