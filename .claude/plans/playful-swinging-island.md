# Plan: Inbound Intent Classification + Proactive Agent Triggers

## Context

Moving Matchlist from "campaign tool you operate" to "relationship agent that operates for you." Two features that make the biggest difference:

1. **Inbound intent classification** — when a response is marked, AI classifies the intent and routes to the right action (not just a binary "responded" flag)
2. **Proactive triggers** — a scheduled agent that continuously scans data, detects opportunities, and takes autonomous action

---

## 1. Inbound Intent Classification

### Current state
When user clicks "Mark as Responded", the system:
- Sets `respondedAt` on the message
- Cancels follow-up sequences
- Logs "Response received"
- Schedules a blind AI reply (doesn't know what the prospect said)

### New flow
When user clicks "Mark as Responded", optionally pastes the reply text, the system:

1. **AI classifies the intent** into one of:
   - `interested` — wants more info, meeting, next steps
   - `positive` — accepted, agreed, will do it
   - `question` — asking for clarification
   - `referral` — redirecting to someone else ("talk to my colleague")
   - `not_now` — timing isn't right but not a hard no
   - `declined` — clear no, unsubscribe
   - `out_of_office` — auto-reply, try again later

2. **Routes to the right action based on classification:**
   - `interested/positive/question` → generate tailored reply, keep in active pipeline
   - `referral` → log the referral, create new prospect for the referred person if name/email given
   - `not_now` → pause sequence, schedule re-engagement in 30/60/90 days via Cronlet
   - `declined` → mark as cold, stop all sequences, log permanently
   - `out_of_office` → reschedule the original message for +7 days

3. **The AI reply is tailored to the classification** — not a generic follow-up

### Schema changes

Add to `outreachMessages`:
```
responseText: v.optional(v.string()),         // The prospect's reply (pasted by user)
responseIntent: v.optional(v.string()),       // AI-classified intent
responseClassifiedAt: v.optional(v.number()),
```

### Convex changes

**`convex/pipeline/intentClassifier.ts`** (new) — Internal action:
- Receives: original message + response text (or empty)
- Calls Claude with classification prompt
- Returns: `{ intent, confidence, suggestedAction, reasoning }`

**`convex/outreach/mutations.ts`** — Update `markResponded`:
- Accept optional `responseText` arg
- If response text provided, schedule intent classification
- If no text, still mark responded + generate generic reply (current behaviour)

**`convex/pipeline/intentRouter.ts`** (new) — Internal mutation:
- Called after classification completes
- Routes based on intent:
  - `interested/positive/question`: schedule reply generation with context
  - `referral`: log + optionally create new prospect
  - `not_now`: schedule Cronlet re-engagement task (30 days)
  - `declined`: mark prospect as `disengaged`, stop all automation
  - `out_of_office`: reschedule send for +7 days

### UI changes

**`components/review/message-detail.tsx`** — Update "Mark as Responded":
- Instead of a simple button, show a small form:
  - Textarea: "Paste the reply (optional)" — collapsible, not required
  - Button: "Classify & Route" (or just "Mark Responded" if no text)
- After classification, show the result inline:
  - Intent badge: "Interested" (green) / "Declined" (red) / etc.
  - AI reasoning: "They asked about the submission process — this is a warm lead"
  - Suggested action: "Send detailed follow-up with matching gift guide"
  - The generated reply is already being drafted below

**`components/review/message-list.tsx`** — Show intent badge on responded messages:
  - "Interested" / "Declined" / "OOO" etc. with color coding

---

## 2. Proactive Agent Triggers

### Concept

A scheduled job (via Convex crons or Cronlet) that runs periodically, analyses all data, detects actionable moments, and either:
- **Takes autonomous action** (if auto-send is on): generates messages, schedules sends
- **Creates signals** (if auto-send is off): surfaces in the Signals panel for the user

This is the difference between "signals you look at" and "an agent that acts."

### Trigger types

**Re-engagement triggers:**
- Prospect sent message 14+ days ago, no open → re-try with different subject line (auto)
- Prospect opened but didn't respond, 7+ days → send follow-up (auto or signal)
- Prospect marked `not_now` 30+ days ago → re-engage (auto or signal)

**Opportunity triggers:**
- New enrichment reveals match eligibility → draft matching gift outreach (auto)
- Donor score > 80 and no outreach yet → prioritise and draft (auto or signal)
- Website intelligence found CSR programme → flag for sponsorship outreach (signal)

**Maintenance triggers:**
- Campaign has prospects with failed enrichments → auto-retry (auto)
- Campaign has stale drafts (7+ days unreviewed) → remind user (signal)
- Daily send quota not reached → suggest more outreach (signal)

### Implementation

**`convex/agent/triggers.ts`** (new) — The agent brain:

```typescript
// Scheduled to run every hour (or via Cronlet every 30 min)
export const runTriggerScan = internalAction({
  // 1. Get all orgs
  // 2. For each org, scan data for trigger conditions
  // 3. For each trigger fired:
  //    - If auto-action: execute (generate message, schedule send, retry enrichment)
  //    - If signal-only: create activity log entry + update signals
  // 4. Log what the agent did
});
```

**`convex/agent/actions.ts`** (new) — Autonomous actions the agent can take:

```typescript
export const autoRetryFailedEnrichments = internalAction(...)
export const autoGenerateForHighScoreProspects = internalAction(...)
export const autoResendWithNewSubject = internalAction(...)
export const autoReEngageLapsed = internalAction(...)
```

**`convex/crons.ts`** (new) — Schedule the trigger scan:
```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval("agent trigger scan", { minutes: 30 }, internal.agent.triggers.runTriggerScan);
export default crons;
```

### Activity log for agent actions

When the agent takes autonomous action, it logs clearly:
- Type: `agent_action` (distinct from user-initiated `enrichment_complete` etc.)
- Message: "Agent: Re-sent email to Sarah Mitchell with new subject line (original had no opens after 14 days)"
- This shows up in the Activity feed with a distinct "Agent" label

### Schema changes

Add to `prospects`:
```
engagementStatus: v.optional(v.string()),  // "active" | "lapsed" | "disengaged" | "reengaging"
lastAgentAction: v.optional(v.number()),   // timestamp of last autonomous action
```

### Signals integration

The existing `analytics/signals.ts` already surfaces passive signals. The agent trigger scan adds:
- Signals with `type: "agent_action"` — "Agent re-sent 3 emails with new subject lines"
- Signals with `type: "agent_recommendation"` — "Agent found 5 high-score prospects to contact. Auto-send is off — approve to proceed."

### UI: Agent status on dashboard

Add a small "Agent" status card to the dashboard:
```
┌─────────────────────────────────────────┐
│ 🤖 Agent Status                        │
│ Last scan: 12 minutes ago              │
│ Actions today: 3 re-sends, 2 follow-ups│
│ Pending recommendations: 5             │
└─────────────────────────────────────────┘
```

---

## Files

### Create
| File | Purpose |
|------|---------|
| `convex/pipeline/intentClassifier.ts` | AI intent classification action |
| `convex/pipeline/intentRouter.ts` | Route actions based on classified intent |
| `convex/agent/triggers.ts` | Scheduled trigger scan — the agent brain |
| `convex/agent/actions.ts` | Autonomous actions (retry, re-send, re-engage) |
| `convex/crons.ts` | Schedule agent scan every 30 min |
| `components/dashboard/agent-status.tsx` | Agent status card for dashboard |

### Modify
| File | Change |
|------|--------|
| `convex/schema.ts` | Add `responseText`, `responseIntent`, `responseClassifiedAt` to outreachMessages. Add `engagementStatus`, `lastAgentAction` to prospects. |
| `convex/outreach/mutations.ts` | Update `markResponded` to accept `responseText`, schedule classification |
| `convex/pipeline/replyGenerator.ts` | Accept intent + response text for tailored replies |
| `components/review/message-detail.tsx` | Response text input + intent display |
| `components/review/message-list.tsx` | Intent badge on responded messages |
| `app/(dashboard)/dashboard/page.tsx` | Add agent status card |

---

## Verification

### Intent Classification
- [ ] "Mark as Responded" shows optional text input for pasting reply
- [ ] With text: AI classifies intent, shows badge + reasoning
- [ ] `interested` → tailored reply generated
- [ ] `declined` → prospect marked disengaged, sequences stopped
- [ ] `out_of_office` → reschedules for +7 days
- [ ] Without text: existing behaviour (generic reply)
- [ ] Intent badge shows in message list

### Proactive Agent
- [ ] Cron job runs every 30 minutes
- [ ] Auto-retries failed enrichments
- [ ] Re-sends emails with no opens after 14 days (new subject)
- [ ] Generates outreach for high-score prospects without messages
- [ ] Logs all actions with "Agent:" prefix in activity feed
- [ ] Agent status card shows on dashboard
- [ ] With auto-send off: creates signals/recommendations instead of acting
