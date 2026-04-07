"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CampaignStatus } from "@/lib/supabase/types";

export default function CampaignSettingsPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<CampaignStatus>("active");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      if (res.ok) {
        const data = await res.json();
        setName(data.campaign.name);
        setDescription(data.campaign.description || "");
        setStatus(data.campaign.status);
      }
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || null, status }),
      });
      if (res.ok) {
        toast.success("Campaign updated");
      } else {
        toast.error("Failed to update campaign");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <div className="max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as CampaignStatus)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enrichment Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Enrichment column configuration will be available in Phase 3. The default pipeline for this campaign type is currently active.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
