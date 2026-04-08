"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  LinkedinIcon,
  GiftIcon,
  AiBeautifyIcon,
  UserIcon,
  Globe02Icon,
} from "@hugeicons/core-free-icons";

const API_KEY_FIELDS = [
  { key: "ANTHROPIC_API_KEY", label: "AI Message Writer", description: "Powered by Claude — generates personalised outreach", icon: AiBeautifyIcon },
  { key: "FIRECRAWL_API_KEY", label: "Website Intelligence", description: "Powered by Firecrawl — scrapes company websites for CSR info", icon: Globe02Icon },
  { key: "DOUBLE_THE_DONATION_API_KEY", label: "Matching Gift Database", description: "Powered by Double the Donation", icon: GiftIcon },
];

const PROFILE_FIELDS = [
  { key: "ORG_NAME", label: "Organisation Name", placeholder: "e.g. Habitat for Humanity", type: "input" as const },
  { key: "SENDER_NAME", label: "Sender Name", placeholder: "e.g. Karen Hughes", type: "input" as const },
  { key: "SENDER_TITLE", label: "Sender Title", placeholder: "e.g. Development Director", type: "input" as const },
  { key: "SENDER_SIGNATURE", label: "Email Signature", placeholder: "Karen Hughes\nDevelopment Director\nHabitat for Humanity\nkaren@habitatni.org", type: "textarea" as const },
];

export function SettingsForm() {
  const settings = useQuery(api.settings.queries.get) ?? {};
  const updateSettings = useMutation(api.settings.mutations.update);
  const [localEdits, setLocalEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const getValue = (key: string) => localEdits[key] ?? settings[key] ?? "";
  const hasEdits = Object.keys(localEdits).length > 0;

  function setField(key: string, value: string) {
    setLocalEdits((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateSettings({ settings: localEdits });
      toast.success("Settings saved");
      setLocalEdits({});
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
      </TabsList>

      {/* Profile Tab */}
      <TabsContent value="profile" className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Your sender identity. This is used in AI-generated emails — the name, title, and signature that appear in outreach.
        </p>

        <Card>
          <CardContent className="space-y-4">
            {PROFILE_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="text-sm font-medium">{field.label}</label>
                {field.type === "textarea" ? (
                  <Textarea
                    value={getValue(field.key)}
                    onChange={(e) => setField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="mt-1 font-mono text-sm"
                    rows={4}
                  />
                ) : (
                  <Input
                    value={getValue(field.key)}
                    onChange={(e) => setField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="mt-1"
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Preview */}
        {(getValue("SENDER_NAME") || getValue("SENDER_SIGNATURE")) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Signature Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-line text-sm text-muted-foreground">
                {getValue("SENDER_SIGNATURE") || `${getValue("SENDER_NAME")}${getValue("SENDER_TITLE") ? `\n${getValue("SENDER_TITLE")}` : ""}${getValue("ORG_NAME") ? `\n${getValue("ORG_NAME")}` : ""}`}
              </div>
            </CardContent>
          </Card>
        )}

        <Button onClick={handleSave} disabled={saving || !hasEdits} className="w-full">
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </TabsContent>

      {/* Integrations Tab */}
      <TabsContent value="integrations" className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          API keys are stored securely. Enter a new value to update.
        </p>

        {API_KEY_FIELDS.map((field) => {
          const hasValue = !!settings[field.key];
          return (
            <Card key={field.key} className={cn("transition-colors", hasValue && "border-primary/20")}>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", hasValue ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    <HugeiconsIcon icon={field.icon} strokeWidth={1.5} className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">{field.label}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">{field.description}</p>
                      </div>
                      <Badge variant={hasValue ? "default" : "outline"} className="ml-2 shrink-0">
                        {hasValue ? "Connected" : "Not configured"}
                      </Badge>
                    </div>
                    <Input
                      type="password"
                      value={getValue(field.key)}
                      onChange={(e) => setField(field.key, e.target.value)}
                      placeholder="Enter API key"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Button onClick={handleSave} disabled={saving || !hasEdits} className="w-full">
          {saving ? "Saving..." : "Save Integrations"}
        </Button>
      </TabsContent>
    </Tabs>
  );
}
