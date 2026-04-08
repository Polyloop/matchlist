import { streamText, convertToModelMessages, UIMessage } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { auth } from "@clerk/nextjs/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const { userId, getToken } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const token = await getToken({ template: "convex" });
  if (token) convex.setAuth(token);

  const { messages }: { messages: UIMessage[] } = await req.json();
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `You are MatchList, an AI outreach agent for non-profits. You help create campaigns, enrich prospects, generate personalised emails, and manage outreach through conversation.

Be warm, concise, action-oriented. When asked to do something, use tools immediately. After executing, summarise plainly and suggest next steps.`,
    messages: await convertToModelMessages(messages),
    tools: {
      createCampaign: {
        description: "Create a new outreach campaign",
        inputSchema: z.object({
          name: z.string(),
          type: z.enum(["donation_matching", "grant_research", "corporate_sponsorship", "volunteer_matching", "in_kind_donation"]),
          description: z.string().optional(),
        }),
        execute: async ({ name, type, description }) => {
          try {
            const id = await convex.mutation(api.campaigns.mutations.create, { name, type, description });
            return { success: true, campaignId: id, name, type };
          } catch (e) { return { success: false, error: String(e) }; }
        },
      },
      listCampaigns: {
        description: "List all campaigns",
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const campaigns = await convex.query(api.campaigns.queries.list);
            return { campaigns: campaigns.map((c: any) => ({ id: c._id, name: c.name, type: c.type, status: c.status, prospectCount: c.prospectCount })) };
          } catch (e) { return { error: String(e) }; }
        },
      },
      getMetrics: {
        description: "Get global dashboard metrics",
        inputSchema: z.object({}),
        execute: async () => {
          try { return await convex.query(api.analytics.queries.global); }
          catch (e) { return { error: String(e) }; }
        },
      },
      getSignals: {
        description: "Get proactive signals and recommendations — what to focus on",
        inputSchema: z.object({}),
        execute: async () => {
          try { return await convex.query(api.analytics.signals.getSignals); }
          catch (e) { return { error: String(e) }; }
        },
      },
      listDrafts: {
        description: "List message drafts needing review",
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const msgs = await convex.query(api.outreach.queries.list, {});
            const drafts = msgs.filter((m: any) => m.status === "draft");
            return { count: drafts.length, drafts: drafts.slice(0, 10).map((m: any) => ({ id: m._id, prospectName: m.prospectName, subject: m.subject, preview: m.content.slice(0, 80) })) };
          } catch (e) { return { error: String(e) }; }
        },
      },
      approveAllDrafts: {
        description: "Approve all draft messages",
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const msgs = await convex.query(api.outreach.queries.list, {});
            const ids = msgs.filter((m: any) => m.status === "draft").map((m: any) => m._id);
            if (ids.length === 0) return { approved: 0 };
            const r = await convex.mutation(api.outreach.mutations.bulkApprove, { ids });
            return { approved: r.approved };
          } catch (e) { return { error: String(e) }; }
        },
      },
      runPipeline: {
        description: "Re-run the enrichment pipeline for a campaign",
        inputSchema: z.object({ campaignId: z.string() }),
        execute: async ({ campaignId }) => {
          try {
            const r = await convex.mutation(api.pipeline.actions.rerunPipeline, { campaignId: campaignId as any });
            return { success: true, triggered: r.triggered };
          } catch (e) { return { success: false, error: String(e) }; }
        },
      },
      updateProfile: {
        description: "Update sender profile (ORG_NAME, SENDER_NAME, SENDER_TITLE, SENDER_SIGNATURE)",
        inputSchema: z.object({ settings: z.record(z.string(), z.string()) }),
        execute: async ({ settings }) => {
          try { await convex.mutation(api.settings.mutations.update, { settings }); return { success: true, updated: Object.keys(settings) }; }
          catch (e) { return { success: false, error: String(e) }; }
        },
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
