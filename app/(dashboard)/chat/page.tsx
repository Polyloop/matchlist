"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SentIcon,
  Loading01Icon,
  AiBeautifyIcon,
  UserIcon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

const transport = new DefaultChatTransport({ api: "/api/chat" });

export default function ChatPage() {
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "streaming" || status === "submitted";

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

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 pt-20 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                <HugeiconsIcon icon={AiBeautifyIcon} strokeWidth={1.5} className="size-7 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">MatchList Agent</h1>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Your AI-powered outreach assistant. Create campaigns, enrich prospects, generate personalised emails — just ask.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[
                  "Create a donation matching campaign",
                  "What should I focus on today?",
                  "Show me my campaigns",
                  "How many drafts need review?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage({ text: suggestion })}
                    className="rounded-md border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}>
              <div className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full",
                message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
              )}>
                <HugeiconsIcon
                  icon={message.role === "user" ? UserIcon : AiBeautifyIcon}
                  strokeWidth={1.5}
                  className="size-4"
                />
              </div>
              <div className={cn("min-w-0 max-w-[85%] space-y-2", message.role === "user" && "text-right")}>
                {message.parts.map((part, i) => {
                  // Text parts
                  if (part.type === "text" && part.text.trim()) {
                    return (
                      <div
                        key={i}
                        className={cn(
                          "inline-block rounded-lg px-4 py-2.5 text-sm leading-relaxed",
                          message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                        )}
                      >
                        <div className="whitespace-pre-wrap">{part.text}</div>
                      </div>
                    );
                  }

                  // Tool parts — typed as tool-{name}
                  if (part.type.startsWith("tool-")) {
                    const p = part as any;
                    return <ToolCard key={i} toolType={part.type} state={p.state} input={p.input} output={p.output} errorText={p.errorText} />;
                  }

                  return null;
                })}
              </div>
            </div>
          ))}

          {isLoading && (messages.length === 0 || messages[messages.length - 1]?.role !== "assistant") && (
            <div className="flex gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <HugeiconsIcon icon={Loading01Icon} strokeWidth={1.5} className="size-4 animate-spin" />
              </div>
              <div className="rounded-lg bg-muted px-4 py-2.5 text-sm text-muted-foreground">Thinking...</div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t bg-background px-4 py-3">
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-2xl gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="min-h-[44px] max-h-[120px] resize-none text-sm"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
            }}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
            <HugeiconsIcon icon={SentIcon} strokeWidth={1.5} className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function ToolCard({ toolType, state, input, output, errorText }: {
  toolType: string; state: string; input?: any; output?: any; errorText?: string;
}) {
  const toolName = toolType.replace("tool-", "");
  const labels: Record<string, string> = {
    createCampaign: "Creating campaign",
    listCampaigns: "Fetching campaigns",
    getCampaignStatus: "Checking campaign",
    getMetrics: "Loading metrics",
    getSignals: "Checking signals",
    listDrafts: "Loading drafts",
    approveAllDrafts: "Approving drafts",
    runPipeline: "Running pipeline",
    updateProfile: "Updating profile",
    getSettings: "Loading settings",
  };
  const label = labels[toolName] || toolName;
  const isComplete = state === "output-available";
  const isError = state === "output-error";
  const isRunning = state === "input-streaming" || state === "input-available";

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
          {(isComplete || isError) && (
            <Badge variant={isComplete ? "secondary" : "destructive"} className="ml-auto text-[9px]">
              {isComplete ? "Done" : "Failed"}
            </Badge>
          )}
        </div>
        {isComplete && output && (
          <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
            {toolName === "createCampaign" && output.name && <p>Created: <span className="text-foreground font-medium">{output.name}</span></p>}
            {toolName === "listCampaigns" && Array.isArray(output.campaigns) && <p>{output.campaigns.length} campaigns</p>}
            {toolName === "listDrafts" && <p>{output.count || 0} drafts to review</p>}
            {toolName === "approveAllDrafts" && <p>{output.approved || 0} approved</p>}
            {toolName === "runPipeline" && <p>Started for {output.triggered || 0} prospects</p>}
          </div>
        )}
        {isError && errorText && <p className="mt-1 text-[10px] text-destructive">{errorText}</p>}
      </CardContent>
    </Card>
  );
}
