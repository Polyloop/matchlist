"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API_KEY_FIELDS = [
  {
    key: "BRIGHT_DATA_API_KEY",
    label: "Bright Data API Key",
    description: "LinkedIn profile enrichment via Bright Data",
  },
  {
    key: "DOUBLE_THE_DONATION_API_KEY",
    label: "Double the Donation API Key",
    description: "Matching gift eligibility checks",
  },
  {
    key: "ANTHROPIC_API_KEY",
    label: "Anthropic API Key",
    description: "Claude API for message generation",
  },
];

interface SettingsFormProps {
  orgName: string;
  clerkOrgId: string;
}

export function SettingsForm({ orgName: initialOrgName, clerkOrgId }: SettingsFormProps) {
  const [orgName, setOrgName] = useState(initialOrgName);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setApiKeys(data);
          if (data.org_name) setOrgName(data.org_name);
        }
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, string> = { org_name: orgName };
      for (const field of API_KEY_FIELDS) {
        if (apiKeys[field.key]) {
          body[field.key] = apiKeys[field.key];
        }
      }

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success("Settings saved");
        // Reload masked values
        const refreshRes = await fetch("/api/settings");
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setApiKeys(data);
        }
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Tabs defaultValue="organization">
      <TabsList>
        <TabsTrigger value="organization">Organization</TabsTrigger>
        <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
      </TabsList>

      <TabsContent value="organization" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Organization Name</label>
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="mt-1"
                placeholder="Your nonprofit name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Clerk Org ID</label>
              <Input value={clerkOrgId} readOnly className="mt-1 opacity-60" />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="api-keys" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              API keys are encrypted and stored securely. Enter a new value to
              update, or leave the masked value to keep the existing key.
            </p>
            <Separator />
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              API_KEY_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="text-sm font-medium">{field.label}</label>
                  <p className="mb-1 text-xs text-muted-foreground">
                    {field.description}
                  </p>
                  <Input
                    type="password"
                    value={apiKeys[field.key] || ""}
                    onChange={(e) =>
                      setApiKeys((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    placeholder="Enter API key"
                    className="font-mono text-sm"
                  />
                </div>
              ))
            )}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save API Keys"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="email" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Email Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">From Address</label>
              <Input
                value={process.env.NEXT_PUBLIC_RESEND_FROM_EMAIL || "Set via RESEND_FROM_EMAIL env var"}
                readOnly
                className="mt-1 opacity-60"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Email sender address is configured via the{" "}
              <code className="rounded bg-muted px-1">RESEND_FROM_EMAIL</code>{" "}
              environment variable.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
