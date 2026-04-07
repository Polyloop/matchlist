"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  LinkedinIcon,
  GiftIcon,
  AiBeautifyIcon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Loading01Icon,
} from "@hugeicons/core-free-icons";

const API_KEY_FIELDS = [
  {
    key: "BRIGHT_DATA_API_KEY",
    label: "LinkedIn Enrichment",
    description: "Powered by Bright Data — used to look up donor employment details from LinkedIn profiles",
    icon: LinkedinIcon,
  },
  {
    key: "DOUBLE_THE_DONATION_API_KEY",
    label: "Matching Gift Database",
    description: "Powered by Double the Donation — checks if employer has a matching gift programme",
    icon: GiftIcon,
  },
  {
    key: "ANTHROPIC_API_KEY",
    label: "AI Message Writer",
    description: "Powered by Claude — generates personalised outreach messages tailored to each prospect",
    icon: AiBeautifyIcon,
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
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, "success" | "failed">>({});

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

  async function handleTestConnection(key: string) {
    setTestingKey(key);
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    try {
      const res = await fetch("/api/settings/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      if (res.ok) {
        setTestResults((prev) => ({ ...prev, [key]: "success" }));
        toast.success("Connection successful");
      } else {
        setTestResults((prev) => ({ ...prev, [key]: "failed" }));
        toast.error("Connection failed");
      }
    } catch {
      setTestResults((prev) => ({ ...prev, [key]: "failed" }));
      toast.error("Connection test failed");
    } finally {
      setTestingKey(null);
    }
  }

  return (
    <Tabs defaultValue="organization">
      <TabsList>
        <TabsTrigger value="organization">Organization</TabsTrigger>
        <TabsTrigger value="api-keys">Integrations</TabsTrigger>
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

      <TabsContent value="api-keys" className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          API keys are encrypted and stored securely. Enter a new value to
          update, or leave the masked value to keep the existing key.
        </p>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-32" />
              </Card>
            ))}
          </div>
        ) : (
          API_KEY_FIELDS.map((field) => {
            const hasValue = !!apiKeys[field.key] && apiKeys[field.key] !== "";
            const isTesting = testingKey === field.key;
            const testResult = testResults[field.key];

            return (
              <Card key={field.key} className={cn(
                "transition-colors",
                hasValue && "border-primary/20",
              )}>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg",
                      hasValue ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}>
                      <HugeiconsIcon icon={field.icon} strokeWidth={1.5} className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium">{field.label}</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {field.description}
                          </p>
                        </div>
                        <Badge
                          variant={hasValue ? "default" : "outline"}
                          className="ml-2 shrink-0"
                        >
                          {hasValue ? "Connected" : "Not configured"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
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
                        {hasValue && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestConnection(field.key)}
                            disabled={isTesting}
                            className="shrink-0"
                          >
                            {isTesting ? (
                              <HugeiconsIcon icon={Loading01Icon} strokeWidth={1.5} className="mr-1 size-3.5 animate-spin" />
                            ) : testResult === "success" ? (
                              <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={1.5} className="mr-1 size-3.5 text-green-500" />
                            ) : testResult === "failed" ? (
                              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.5} className="mr-1 size-3.5 text-destructive" />
                            ) : null}
                            Test
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Integrations"}
        </Button>
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
              <code className="rounded-md bg-muted px-1">RESEND_FROM_EMAIL</code>{" "}
              environment variable.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
