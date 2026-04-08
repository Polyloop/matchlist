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
    system: `You are Scout, an autonomous membership AI agent built by MatchList for non-profits. You help organisations understand their alumni, member, and supporter networks — and take intelligent action to deepen those relationships.

You are not just an outreach tool. You are a digital membership and research officer who understands relationship history, identifies the right people to engage, and knows the right approach for each person. You speak in first person as Scout.

PERSONALITY: Warm, concise, action-oriented. Use tools immediately. After executing, summarise plainly and suggest next steps.

IMPORTANT RULES:
- Do NOT create a new campaign unless the user explicitly says "create a campaign" or "new campaign"
- When asked to draft a message or work with a prospect, first use listCampaigns to find where they already are
- If unsure which campaign, ask the user rather than creating a new one
- Use analyseNetwork to understand the network BEFORE suggesting actions
- When greeted or asked an open question ("good morning", "what's happening"), use getBriefing first
- If the message starts with [BRIEFING], call getBriefing and respond naturally as a greeting. Never mention the [BRIEFING] tag.
- STAY FOCUSED: You are a membership and outreach agent. Everything you do should relate to prospects, campaigns, relationships, or outreach. If asked something unrelated, politely redirect to how you can help with their network.
- Use researchCompany ONLY when preparing outreach for a specific prospect or when a user asks about a prospect's employer. Never for general curiosity.

KEY CAPABILITIES:
- Analyse networks: "Who should we reconnect with?" — use analyseNetwork to prioritise by relationship history + match potential
- Understand relationships: prospects have membership status, engagement history, donation records, personal notes
- Different outreach intents: reconnect (no ask), invite, share value, renew membership, or ask for donation
- Morning briefing: use getBriefing for live status updates

When recommending people, explain WHY each person matters and WHAT approach to use.`,
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
      importProspects: {
        description: "Import prospects into a campaign. Use when user provides a list of people, pastes CSV data, or asks to add contacts. Each row needs at least a name. Ask for campaignId if not clear which campaign.",
        inputSchema: z.object({
          campaignId: z.string().describe("Campaign ID to import into"),
          rows: z.array(z.object({
            name: z.string(),
            email: z.string().optional(),
            employer: z.string().optional(),
            role: z.string().optional(),
            membershipStatus: z.string().optional(),
            memberSince: z.string().optional(),
            lastEngagement: z.string().optional(),
            engagementType: z.string().optional(),
            donationHistory: z.string().optional(),
            notes: z.string().optional(),
          })),
        }),
        execute: async ({ campaignId, rows }) => {
          try {
            const r = await convex.mutation(api.prospects.mutations.importProspects, {
              campaignId: campaignId as any,
              rows: rows.map((row: Record<string, string | undefined>) => ({ ...row, name: row.name! })),
            });
            return { success: true, imported: r.imported, errors: r.errors.length, total: r.total };
          } catch (e) { return { success: false, error: String(e) }; }
        },
      },
      researchCompany: {
        description: "Research a prospect's employer for matching gift programmes and CSR activity. ONLY use this when a user asks about a specific prospect's employer or when preparing outreach for a prospect. Do NOT use for general company research unrelated to a prospect.",
        inputSchema: z.object({
          companyName: z.string().describe("The employer name from a prospect record"),
          prospectName: z.string().optional().describe("The prospect this research is for"),
        }),
        execute: async ({ companyName, question }) => {
          try {
            const settings = await convex.query(api.settings.queries.get);
            const firecrawlKey = Object.entries(settings).find(([k]) => k === "FIRECRAWL_API_KEY")?.[1];

            if (!firecrawlKey || firecrawlKey.includes("...")) {
              return { error: "Firecrawl API key not configured. Add it in Settings → Integrations." };
            }

            const domain = companyName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
            const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${firecrawlKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url: `https://${domain}`,
                formats: ["extract"],
                extract: {
                  schema: {
                    type: "object",
                    properties: {
                      has_matching_gift_programme: { type: "boolean", description: "Does this company match employee charitable donations?" },
                      match_ratio: { type: "string", description: "Match ratio e.g. '1:1' or '2:1'" },
                      match_cap: { type: "string", description: "Annual matching cap e.g. '$10,000'" },
                      programme_name: { type: "string", description: "Name of matching/giving programme" },
                      volunteer_programme: { type: "boolean", description: "Do they have employee volunteer programmes?" },
                      volunteer_grants: { type: "boolean", description: "Do they give grants for employee volunteer hours?" },
                      csr_summary: { type: "string", description: "Summary of CSR / community involvement" },
                      recent_giving_news: { type: "string", description: "Any recent news about corporate giving or community involvement" },
                      key_contacts: { type: "string", description: "CSR/foundation team contacts if listed" },
                      about_summary: { type: "string", description: "Brief company description" },
                    },
                  },
                  prompt: question || "Extract all information about this company's charitable giving, matching gift programmes, volunteer programmes, and CSR activity.",
                },
              }),
            });

            if (!response.ok) {
              return { error: `Firecrawl returned ${response.status}`, companyName };
            }

            const data = await response.json();
            return { companyName, website: `https://${domain}`, ...(data?.data?.extract || {}) };
          } catch (e) {
            return { error: String(e), companyName };
          }
        },
      },
      getProspectEmail: {
        description: "Get the outreach email for a specific prospect by name. Shows the email content, status, and confidence score.",
        inputSchema: z.object({ prospectName: z.string() }),
        execute: async ({ prospectName }) => {
          try {
            const msgs = await convex.query(api.outreach.queries.list, {});
            const match = msgs.find((m: any) =>
              m.prospectName.toLowerCase().includes(prospectName.toLowerCase()),
            );
            if (!match) return { found: false, prospectName };
            return {
              found: true,
              messageId: match._id,
              prospectName: match.prospectName,
              prospectEmail: match.prospectEmail,
              subject: match.subject,
              content: match.content,
              status: match.status,
              confidenceScore: match.confidenceScore,
              campaignName: match.campaignName,
            };
          } catch (e) { return { error: String(e) }; }
        },
      },
      analyseNetwork: {
        description: "Analyse the prospect network — who to prioritise, why, and what approach. Use this when asked 'who should I talk to', 'who should we reconnect with', 'analyse our network', etc.",
        inputSchema: z.object({ campaignId: z.string().optional() }),
        execute: async ({ campaignId }) => {
          try {
            return await convex.query(api.prospects.networkAnalysis.analyse, {
              campaignId: campaignId ? campaignId as any : undefined,
            });
          } catch (e) { return { error: String(e) }; }
        },
      },
      getBriefing: {
        description: "Get a morning briefing — metrics, signals, pending actions. Use on first message or when asked 'what's happening', 'give me an update', 'good morning', etc.",
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const [metrics, signals, drafts] = await Promise.all([
              convex.query(api.analytics.queries.global),
              convex.query(api.analytics.signals.getSignals),
              convex.query(api.outreach.queries.list, {}),
            ]);
            const draftCount = drafts.filter((m: any) => m.status === "draft").length;
            const sentCount = drafts.filter((m: any) => m.status === "sent").length;
            const respondedCount = drafts.filter((m: any) => m.respondedAt).length;
            return { metrics, signals, draftCount, sentCount, respondedCount };
          } catch (e) { return { error: String(e) }; }
        },
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
