# Plan: Chat Experience Polish — Auto-briefing, Rich Cards, CSV Drop, Email Preview, Live Progress

## Context

The chat agent works but feels like a CLI with pretty formatting. These 5 features turn it into something that wows in a demo.

---

## 1. Auto-briefing on Load

**Goal:** When the chat page loads, the agent automatically sends a briefing. No empty state.

**Approach:** On mount, if there are no messages, auto-send a hidden "briefing" message that triggers the agent to call `getBriefing` and respond.

**File:** `app/(dashboard)/chat/page.tsx`

```tsx
useEffect(() => {
  if (messages.length === 0 && status === "ready") {
    sendMessage({ text: "[AUTO] Give me a briefing" });
  }
}, []);
```

**Update system prompt** to recognise `[AUTO]` prefix as an auto-briefing trigger — respond as if the user just opened the app. Don't repeat the `[AUTO]` text back. Just give the briefing naturally.

The user never sees the trigger message — filter it out of the rendered messages list:
```tsx
const visibleMessages = messages.filter(m => !m.content?.startsWith("[AUTO]"));
```

---

## 2. Rich Inline Cards for Tool Results

**Goal:** Tool results render as interactive UI cards, not text summaries.

**Approach:** Expand the `ToolCard` component to render different card types based on which tool was called. When Claude calls `listCampaigns`, the card shows campaign cards. When it calls `listDrafts`, it shows message previews.

**File:** `app/(dashboard)/chat/page.tsx` — Expand `ToolCard`

**Campaign cards** (for `listCampaigns` result):
```
┌─────────────────────────────────┐
│ 🎁 Alumni Reconnection   Active│
│ Donation Matching · 8 prospects │
│                      View →     │
└─────────────────────────────────┘
```
Each card links to `/campaigns/{id}`.

**Network analysis cards** (for `analyseNetwork` result):
```
┌─────────────────────────────────┐
│ 🔥 Sarah Mitchell              │
│ Former board member at Deloitte │
│ Suggest: reconnect              │
│              Draft message →    │
└─────────────────────────────────┘
```

**Draft message cards** (for `listDrafts` result):
```
┌─────────────────────────────────┐
│ To: Sarah Mitchell              │
│ Deloitte matching — are you...  │
│ 85% confidence        Approve → │
└─────────────────────────────────┘
```

**Metrics card** (for `getMetrics` / `getBriefing` result):
```
┌──────┬──────┬──────┬──────────┐
│  3   │  16  │  7   │   12%    │
│ camp │ pros │draft │ response │
└──────┴──────┴──────┴──────────┘
```

**Implementation:** The `ToolCard` component switches on `toolName` and renders the appropriate sub-component with the `output` data. Cards use existing shadcn Card component + our icon library.

---

## 3. CSV Drop into Chat

**Goal:** Drag a CSV onto the chat or click an attach button. Agent reads it, shows a preview, asks which campaign, imports.

**Approach:**
- Add a file input (hidden) + paperclip button next to the send button
- Add drag-and-drop zone over the entire chat area
- On file drop: parse CSV client-side with PapaParse
- Send the parsed data as the message text: "I'm importing a CSV with {N} rows. Columns: {cols}. First 3 rows: {preview}. Which campaign should I import into?"
- The agent sees this context and calls `importProspects` after confirming the campaign

**Files:**
- `app/(dashboard)/chat/page.tsx` — add drop zone, file input, parse logic

No server changes needed — the CSV is parsed client-side, preview sent as text, and the import tool handles the rest.

---

## 4. Email Preview Card with Approve Button

**Goal:** "Show me the email for Sarah Mitchell" → renders an email card with approve/send buttons inline.

**New chat tool:** `getProspectEmail`
```typescript
getProspectEmail: {
  description: "Get the outreach email for a specific prospect",
  inputSchema: z.object({ prospectName: z.string() }),
  execute: async ({ prospectName }) => {
    // Search prospects by name
    // Find their latest outreach message
    // Return: prospect info + message content + status + confidence
  },
}
```

**Rich card rendering:** When `getProspectEmail` completes, render:
```
┌────────────────────────────────────────────┐
│ To: Sarah Mitchell <sarah@deloitte.com>    │
│ Subject: Reconnecting after the gala       │
│ Status: Draft · 85% confidence             │
│────────────────────────────────────────────│
│ Sarah — it's been two years since...       │
│ ...                                        │
│────────────────────────────────────────────│
│ [Approve]  [Edit in Review →]              │
└────────────────────────────────────────────┘
```

The **Approve** button calls `approveMessage` directly from the card — no need to go to the Review page.

**Files:**
- `app/api/chat/route.ts` — add `getProspectEmail` tool
- `app/(dashboard)/chat/page.tsx` — render email card in ToolCard

---

## 5. Live Progress Updates

**Goal:** After "re-run the pipeline", show live progress in the chat.

**Approach:** After `runPipeline` tool completes, inject a polling component that queries enrichment progress and updates inline until done.

**New component:** `components/chat/pipeline-progress.tsx`
- Takes `campaignId` prop
- Uses `useQuery(api.analytics.queries.campaignAnalytics)` to get enrichment counts
- Renders an inline progress bar: "5/8 enriched · 3 messages generated"
- Updates reactively (Convex queries are live)
- Auto-dismisses or collapses when complete

**Integration:** The `ToolCard` for `runPipeline` renders `<PipelineProgress>` after the tool completes, instead of just "Pipeline running".

**Files:**
- `components/chat/pipeline-progress.tsx` — live progress component
- `app/(dashboard)/chat/page.tsx` — render progress in ToolCard for runPipeline

---

## Files Summary

### Create
| File | Purpose |
|------|---------|
| `components/chat/pipeline-progress.tsx` | Live enrichment progress bar |

### Modify
| File | Change |
|------|--------|
| `app/(dashboard)/chat/page.tsx` | Auto-briefing on load, rich tool cards, CSV drop zone, email card with approve, pipeline progress |
| `app/api/chat/route.ts` | Add `getProspectEmail` tool, update system prompt for auto-briefing |

---

## Verification
- [ ] Chat auto-sends briefing on load — agent greets with live status
- [ ] "Show me my campaigns" → renders clickable campaign cards
- [ ] "Who should I reconnect with?" → renders prospect recommendation cards
- [ ] Drag CSV onto chat → shows preview, asks for campaign, imports
- [ ] "Show me the email for Sarah" → renders email preview with approve button
- [ ] Approve button in email card works
- [ ] "Re-run pipeline" → shows live progress bar that updates reactively
- [ ] All cards are clean, minimal, clickable where appropriate
