# Plan: Chat-First Agent Experience

## Context

The current platform has 15+ pages/screens and feels like every other SaaS dashboard. The vision from the proposal doc is an autonomous membership agent. The experience should feel like talking to an intelligent assistant, not clicking through a CRM.

**Approach:** Replace the dashboard with a chat interface powered by AI SDK `useChat` + tool calling. The agent can do everything the platform does — create campaigns, import data, check status, approve messages, answer questions — all through natural conversation with real tool execution visible inline.

## Architecture

```
User types message
  → Next.js API route /api/chat (streaming)
    → Claude receives message + tool definitions
      → Claude decides: respond with text, or call a tool
        → Tool executes Convex mutation/query
          → Result streams back inline
            → Claude summarises what happened
```

**AI SDK `useChat`** on the frontend handles:
- Message state, streaming, input management
- Tool call display (show what the agent is doing)
- Tool result rendering (inline cards, tables, confirmations)

**Next.js API route** `/app/api/chat/route.ts` handles:
- Receives messages from useChat
- Calls `streamText` with Claude + tool definitions
- Tools execute Convex functions server-side
- Streams response back

**Why a Next.js API route (not Convex action):** AI SDK's `useChat` expects a standard HTTP streaming endpoint. Convex actions can't stream SSE. So we keep one API route for the chat, and it calls Convex functions internally.

## The Tools

Each tool maps to existing Convex functions. The agent decides which to call based on the user's message.

### Campaign management
| Tool | Description | Convex function |
|------|-------------|----------------|
| `createCampaign` | Create a new campaign | `campaigns.mutations.create` |
| `listCampaigns` | Show all campaigns | `campaigns.queries.list` |
| `getCampaignStatus` | Get campaign details + metrics | `campaigns.queries.get` + `analytics.queries.campaignAnalytics` |

### Prospect management
| Tool | Description | Convex function |
|------|-------------|----------------|
| `importProspects` | Import from provided data | `prospects.mutations.importProspects` |
| `getProspectProfile` | Show prospect intelligence | `prospects.intelligenceQueries.getProfile` |
| `searchProspects` | Find prospects by name/employer | `prospects.queries.list` with filter |

### Pipeline & enrichment
| Tool | Description | Convex function |
|------|-------------|----------------|
| `runPipeline` | Start/re-run pipeline for a campaign | `pipeline.actions.rerunPipeline` |
| `getPipelineStatus` | Check what's running | `analytics.queries.campaignAnalytics` |

### Outreach
| Tool | Description | Convex function |
|------|-------------|----------------|
| `listDrafts` | Show messages needing review | `outreach.queries.list` filtered to drafts |
| `approveMessage` | Approve a draft | `outreach.mutations.approve` |
| `approveAll` | Approve all drafts | `outreach.mutations.bulkApprove` |
| `sendMessage` | Send an approved message | `outreach.mutations.sendNow` |

### Settings
| Tool | Description | Convex function |
|------|-------------|----------------|
| `updateProfile` | Set org name, sender name, etc. | `settings.mutations.update` |
| `updateApiKey` | Configure an integration | `settings.mutations.update` |

### Intelligence
| Tool | Description | Convex function |
|------|-------------|----------------|
| `getSignals` | What should I focus on? | `analytics.signals.getSignals` |
| `getMetrics` | Global dashboard metrics | `analytics.queries.global` |

## UI Layout

### Simplified app structure

```
┌──────────────┬─────────────────────────────────────────┐
│  Sidebar     │  Main content                           │
│              │                                          │
│  MatchList   │  ┌──────────────────────────────────┐   │
│              │  │ Chat messages                     │   │
│  💬 Chat     │  │                                    │   │
│  📊 Table    │  │ You: Create a donation matching    │   │
│  📬 Review   │  │      campaign for our spring gala  │   │
│              │  │                                    │   │
│  ─────────── │  │ Agent: ✅ Created "Spring Gala     │   │
│  Campaigns   │  │ Match Drive" with 6 enrichment    │   │
│  > Spring... │  │ steps. Import a CSV to get started.│   │
│  > Q1 Don... │  │                                    │   │
│              │  │ [Campaign Card inline]              │   │
│  + New       │  │                                    │   │
│              │  │ You: Here's my list                 │   │
│  ─────────── │  │ [file: attendees.csv]              │   │
│  ⚙ Settings  │  │                                    │   │
│              │  │ Agent: ✅ Imported 45 prospects.    │   │
│              │  │ Pipeline started — enriching now.   │   │
│              │  │                                    │   │
│              │  │ [Progress: 12/45 enriched]         │   │
│              │  │                                    │   │
│              │  └──────────────────────────────────┘   │
│              │  ┌──────────────────────────────────┐   │
│              │  │ Message input                  📎 │   │
│              │  └──────────────────────────────────┘   │
└──────────────┴─────────────────────────────────────────┘
```

### Sidebar (simplified)
- **Chat** — the main experience (default)
- **Table** — direct access to campaign table view (for when you want the spreadsheet)
- **Review** — direct access to review inbox (for bulk message review)
- Campaigns list (existing)
- Settings

### Chat page (`/dashboard` or `/`)
- Full-height chat interface
- Messages stream in real-time
- Tool calls render as inline cards:
  - Campaign created → campaign card
  - Prospects imported → count + progress
  - Message approved → message preview
  - Signals → signal cards
  - Metrics → metric cards
- File drop zone for CSV import
- Message input at bottom with send button

### Tool call rendering

When Claude calls a tool, the UI shows it inline:

```
Agent is thinking...
  ├─ 🔍 Checking campaign status...
  ├─ 📊 Found: 45 prospects, 32 enriched, 8 messages drafted
  └─ ✅ Done

Your "Spring Gala Match Drive" campaign is looking good:
- 32 of 45 prospects enriched
- 8 personalised messages drafted and waiting for review
- 3 prospects scored 80+ (high priority)

Want me to approve and send the top-scoring messages?
```

## Files

### Create
| File | Purpose |
|------|---------|
| `app/api/chat/route.ts` | Streaming chat endpoint with tool definitions |
| `app/(dashboard)/chat/page.tsx` | Chat page (becomes the default landing) |
| `components/chat/chat-interface.tsx` | Main chat UI using `useChat` |
| `components/chat/message-bubble.tsx` | Renders user + assistant messages |
| `components/chat/tool-call-card.tsx` | Renders tool call results as inline cards |
| `components/chat/file-drop.tsx` | CSV file drop zone in chat input |
| `lib/chat/tools.ts` | Tool definitions (shared between route and UI) |
| `lib/chat/convex-tools.ts` | Tool execute functions that call Convex |

### Modify
| File | Change |
|------|--------|
| `components/sidebar/app-sidebar.tsx` | Simplify nav: Chat (default), Table, Review, Campaigns, Settings |
| `app/page.tsx` | Redirect to `/chat` instead of `/dashboard` |
| `app/(dashboard)/dashboard/page.tsx` | Keep but make secondary — chat is primary |

### Dependencies
```bash
# Already installed: ai, @ai-sdk/anthropic
# No new deps needed — useChat is part of the ai package
```

## Chat API Route

`app/api/chat/route.ts` — the streaming endpoint:

```typescript
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
// Import Convex client for server-side calls

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `You are MatchList, an AI membership agent for non-profits. You help organisations manage outreach campaigns, enrich prospect data, generate personalised messages, and track engagement.

You have access to tools to create campaigns, import prospects, check status, approve messages, and more. Use them proactively — don't just describe what you could do, do it.

Be concise, warm, and action-oriented. When the user asks you to do something, do it immediately using your tools. Show results inline.`,
    messages,
    tools: {
      createCampaign: { ... },
      listCampaigns: { ... },
      // ... all tools
    },
    maxSteps: 5, // Allow multi-step tool calling
  });

  return result.toDataStreamResponse();
}
```

## Key design decisions

1. **Chat is the default page** — not the dashboard. The dashboard becomes a secondary view.
2. **Tool calls are visible** — the user sees what the agent is doing (not a black box).
3. **The table and review views still exist** — for when you want to see/edit data directly. But you reach them from the sidebar, not as the primary experience.
4. **File upload in chat** — drag a CSV onto the chat or click the attach button.
5. **Convex calls happen server-side** — the API route imports the Convex client and calls functions directly. No need for auth passthrough since the chat route is already auth-protected by Clerk middleware.
6. **Multi-step tool calling** — `maxSteps: 5` lets Claude chain actions (create campaign → import → run pipeline) in one turn.

## Verification

- [ ] Chat page loads as the default experience
- [ ] User can type "create a donation matching campaign called Spring Gala" → campaign created
- [ ] User can drop a CSV → prospects imported, pipeline starts
- [ ] "How's my campaign going?" → shows metrics inline
- [ ] "Approve all drafts" → messages approved with confirmation
- [ ] "What should I focus on?" → signals surfaced inline
- [ ] Tool calls render as cards, not raw JSON
- [ ] Streaming feels responsive
- [ ] Sidebar still gives direct access to Table, Review, Settings
