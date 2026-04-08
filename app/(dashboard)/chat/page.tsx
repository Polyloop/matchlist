"use client";

import { useChat } from "@ai-sdk/react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PipelineProgress } from "@/components/chat/pipeline-progress";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SentIcon,
  Loading01Icon,
  AiBeautifyIcon,
  UserIcon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Attachment01Icon,
  GiftIcon,
  Search01Icon,
  Building06Icon,
  PackageIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

const transport = new DefaultChatTransport({ api: "/api/chat" });

const campaignIcons: Record<string, any> = {
  donation_matching: GiftIcon,
  grant_research: Search01Icon,
  corporate_sponsorship: Building06Icon,
  volunteer_matching: UserIcon,
  in_kind_donation: PackageIcon,
};

export default function ChatPage() {
  const { messages, sendMessage, status } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
  const [input, setInput] = useState("");
  const [dragging, setDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasSentBriefing = useRef(false);
  const isLoading = status === "streaming" || status === "submitted";

  // Auto-briefing on first load
  useEffect(() => {
    if (!hasSentBriefing.current && status === "ready" && messages.length === 0) {
      hasSentBriefing.current = true;
      sendMessage({ text: "[BRIEFING] Give me a morning briefing of what's happening." });
    }
  }, [status, messages.length, sendMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  }

  // CSV file handling
  const handleFile = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        const cols = Object.keys(rows[0] || {});
        const preview = rows.slice(0, 3).map((r) =>
          cols.map((c) => `${c}: ${r[c] || "—"}`).join(", ")
        ).join("\n");

        sendMessage({
          text: `I'm uploading a CSV file "${file.name}" with ${rows.length} rows.\n\nColumns found: ${cols.join(", ")}\n\nFirst 3 rows:\n${preview}\n\nPlease import these into the right campaign. If you're not sure which campaign, ask me.`,
        });
      },
    });
  }, [sendMessage]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  // Filter out the auto-briefing trigger message
  const visibleMessages = messages.filter((m) => {
    if (m.role !== "user") return true;
    const textPart = m.parts.find((p) => p.type === "text") as any;
    return !(textPart?.text?.startsWith("[BRIEFING]"));
  });

  return (
    <div
      className="flex h-[calc(100vh-3.5rem)] flex-col"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {dragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-lg border-2 border-dashed border-primary p-12 text-center">
            <p className="text-sm font-medium">Drop your CSV here</p>
            <p className="text-xs text-muted-foreground mt-1">The agent will read it and import your contacts</p>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
          {visibleMessages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center gap-4 pt-20 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                <HugeiconsIcon icon={AiBeautifyIcon} strokeWidth={1.5} className="size-7 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">MatchList Agent</h1>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Your AI membership officer. Understanding relationships, personalising outreach, deepening engagement.
                </p>
              </div>
            </div>
          )}

          {visibleMessages.map((message) => (
            <div key={message.id} className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}>
              <div className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full",
                message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
              )}>
                <HugeiconsIcon
                  icon={message.role === "user" ? UserIcon : AiBeautifyIcon}
                  strokeWidth={1.5} className="size-4"
                />
              </div>
              <div className={cn("min-w-0 max-w-[85%] space-y-2", message.role === "user" && "text-right")}>
                {message.parts.map((part, i) => {
                  if (part.type === "text" && (part as any).text?.trim()) {
                    return (
                      <div key={i} className={cn(
                        "inline-block rounded-lg px-4 py-2.5 text-sm leading-relaxed",
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}>
                        {message.role === "user" ? (
                          <div className="whitespace-pre-wrap">{(part as any).text}</div>
                        ) : (
                          <Streamdown>{(part as any).text}</Streamdown>
                        )}
                      </div>
                    );
                  }
                  if (part.type?.startsWith("tool-")) {
                    const p = part as any;
                    return <ToolCard key={i} toolType={part.type} state={p.state} input={p.input} output={p.output} errorText={p.errorText} />;
                  }
                  return null;
                })}
              </div>
            </div>
          ))}

          {isLoading && (visibleMessages.length === 0 || visibleMessages[visibleMessages.length - 1]?.role !== "assistant") && (
            <div className="flex gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <HugeiconsIcon icon={Loading01Icon} strokeWidth={1.5} className="size-4 animate-spin" />
              </div>
              <div className="rounded-lg bg-muted px-4 py-2.5 text-sm text-muted-foreground">Thinking...</div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-background px-4 py-3">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-2xl gap-2">
          <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleFileInput} />
          <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="shrink-0">
            <HugeiconsIcon icon={Attachment01Icon} strokeWidth={1.5} className="size-4" />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="min-h-[44px] max-h-[120px] resize-none text-sm"
            rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
            <HugeiconsIcon icon={SentIcon} strokeWidth={1.5} className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

// --- Rich Tool Card ---

function ToolCard({ toolType, state, input, output, errorText }: {
  toolType: string; state: string; input?: any; output?: any; errorText?: string;
}) {
  const toolName = toolType.replace("tool-", "");
  const labels: Record<string, [string, string]> = {
    createCampaign: ["Setting up your campaign", "Campaign created"],
    listCampaigns: ["Looking at your campaigns", "Your campaigns"],
    getCampaignStatus: ["Checking campaign progress", "Campaign status"],
    getMetrics: ["Pulling your numbers", "Overview"],
    getSignals: ["Scanning for opportunities", "Signals"],
    listDrafts: ["Checking your inbox", "Messages to review"],
    approveAllDrafts: ["Approving messages", "Messages approved"],
    runPipeline: ["Starting enrichment", "Pipeline running"],
    updateProfile: ["Saving your profile", "Profile updated"],
    getSettings: ["Loading settings", "Settings"],
    analyseNetwork: ["Analysing your network", "Network analysis"],
    getBriefing: ["Preparing your briefing", "Briefing"],
    importProspects: ["Importing contacts", "Import complete"],
    getProspectEmail: ["Finding the email", "Email found"],
    approveMessage: ["Approving message", "Approved"],
    sendMessage: ["Sending message", "Sent"],
  };

  const [runningLabel, completeLabel] = labels[toolName] || [toolName, toolName];
  const isComplete = state === "output-available";
  const isError = state === "output-error";
  const label = isComplete ? completeLabel : isError ? "Something went wrong" : runningLabel;

  // Rich card rendering based on tool type
  if (isComplete && output && !output.error) {
    // Campaign list cards
    if (toolName === "listCampaigns" && Array.isArray(output.campaigns)) {
      return (
        <div className="space-y-2 max-w-sm">
          <p className="text-[11px] text-muted-foreground">{label}</p>
          {output.campaigns.map((c: any) => (
            <Link key={c.id} href={`/campaigns/${c.id}`}>
              <Card className="hover:shadow-sm transition-all hover:-translate-y-px">
                <CardContent className="!p-3 flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <HugeiconsIcon icon={campaignIcons[c.type] || GiftIcon} strokeWidth={1.5} className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.prospectCount} prospects</p>
                  </div>
                  <Badge variant={c.status === "active" ? "default" : "outline"} className="text-[9px]">{c.status}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      );
    }

    // Network analysis — recommendation cards
    if (toolName === "analyseNetwork" && Array.isArray(output.recommendations)) {
      return (
        <div className="space-y-2 max-w-sm">
          <p className="text-[11px] text-muted-foreground">
            {output.total} contacts · {output.lapsedCount} lapsed · {output.matchEligibleCount} match eligible
          </p>
          {output.recommendations.map((r: any, i: number) => (
            <Card key={i} className={cn(r.priority === "high" && "border-amber-200")}>
              <CardContent className="!p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs">{r.priority === "high" ? "🔥" : "💡"}</span>
                  <span className="text-xs font-medium">{r.prospectName}</span>
                  <Badge variant="secondary" className="ml-auto text-[9px]">{r.suggestedIntent}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{r.reason}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    // Email preview card
    if (toolName === "getProspectEmail" && output.found) {
      return (
        <Card className="max-w-md">
          <CardContent className="!p-0">
            <div className="border-b px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{output.subject || "No subject"}</span>
                <Badge variant={output.status === "sent" ? "default" : output.status === "draft" ? "outline" : "secondary"} className="text-[9px]">
                  {output.status}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">To: {output.prospectName} &lt;{output.prospectEmail}&gt;</p>
              {output.confidenceScore && (
                <p className="text-[10px] text-muted-foreground">{output.confidenceScore}% confidence</p>
              )}
            </div>
            <div className="px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
              {output.content}
            </div>
          </CardContent>
        </Card>
      );
    }

    // Draft list cards
    if (toolName === "listDrafts" && Array.isArray(output.drafts)) {
      return (
        <div className="space-y-2 max-w-sm">
          <p className="text-[11px] text-muted-foreground">{output.count} drafts to review</p>
          {output.drafts.map((d: any) => (
            <Card key={d.id}>
              <CardContent className="!p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{d.prospectName}</span>
                  {d.confidenceScore && <span className="text-[9px] text-muted-foreground">{d.confidenceScore}%</span>}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{d.subject || d.preview}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    // Pipeline progress
    if (toolName === "runPipeline" && output.success) {
      return (
        <Card className="max-w-xs">
          <CardContent className="!p-3">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={1.5} className="size-3.5 text-emerald-500" />
              <span className="text-xs font-medium">Pipeline started for {output.triggered} prospects</span>
            </div>
            {input?.campaignId && <PipelineProgress campaignId={input.campaignId} />}
          </CardContent>
        </Card>
      );
    }

    // Metrics card
    if (toolName === "getMetrics" && output && !output.error) {
      return (
        <div className="flex gap-3 max-w-sm">
          {[
            { label: "Campaigns", value: output.activeCampaigns },
            { label: "Prospects", value: output.totalProspects },
            { label: "Sent", value: output.messagesSent },
            { label: "Response", value: `${output.responseRate}%` },
          ].map((m) => (
            <Card key={m.label} className="flex-1">
              <CardContent className="!p-2 text-center">
                <p className="text-sm font-semibold tabular-nums">{m.value}</p>
                <p className="text-[9px] text-muted-foreground">{m.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
  }

  // Default card for other tools
  return (
    <Card className="max-w-xs">
      <CardContent className="!p-3">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={1.5} className="size-3.5 text-emerald-500" />
          ) : isError ? (
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.5} className="size-3.5 text-destructive" />
          ) : (
            <HugeiconsIcon icon={Loading01Icon} strokeWidth={1.5} className="size-3.5 animate-spin text-muted-foreground" />
          )}
          <span className="text-xs font-medium">{label}</span>
        </div>
        {isComplete && output && (
          <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
            {toolName === "createCampaign" && output.name && <p>Created: <span className="text-foreground font-medium">{output.name}</span></p>}
            {toolName === "importProspects" && <p>{output.imported || 0} contacts imported</p>}
            {toolName === "approveAllDrafts" && <p>{output.approved || 0} messages approved</p>}
          </div>
        )}
        {isError && errorText && <p className="mt-1 text-[10px] text-destructive">{errorText}</p>}
      </CardContent>
    </Card>
  );
}
