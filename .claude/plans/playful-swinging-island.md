# Milestone 1: Supporter Memory + Next-Best-Action Engine + Scout Briefing

## Context

Moving from "campaign outreach tool" to "living relationship layer." The supporter becomes the primary object. Scout gets smarter about who matters now, why, and what to do — surfaced through existing surfaces (chat, detail panel, review inbox), not new pages.

Current state: prospects have relationship fields (membershipStatus, engagementTypes, notes, etc.) and basic intelligence (signals, donor score, suggested action). But the intelligence is shallow — it's heuristic rules, not a scored model. Scout can analyse a network but gives generic recommendations.

Target: Every supporter has a scored "why now" explanation and a specific recommended action. Scout's briefing shows the top opportunities across the entire org, not just campaign-level metrics.

---

## 1. Supporter Facts Model

Add a `supporterFacts` table — a source-aware log of every piece of knowledge about a supporter. This is the "memory" layer.

**Add to `convex/schema.ts`:**
```typescript
supporterFacts: defineTable({
  orgId: v.id("organizations"),
  prospectId: v.id("prospects"),
  factType: v.string(),     // "membership", "donation", "event", "outreach", "response", "enrichment", "note", "import"
  content: v.string(),       // human-readable fact: "Donated $2000 in March 2023"
  source: v.string(),        // "csv_import", "pipeline", "agent", "user", "crm", "email_webhook"
  sourceDate: v.optional(v.string()),  // when this fact was true (not when recorded)
  metadata: v.optional(v.any()),
})
  .index("by_prospect", ["prospectId"])
  .index("by_org", ["orgId"]),
```

**On import:** When CSV rows include relationship fields, auto-create facts:
- membershipStatus → fact: "Member status: lapsed since 2023"
- donationHistory → fact: "$2000 in 2023, $1500 in 2022"
- notes → fact: "Former board member. Left after relocation."
- engagementTypes → one fact per type: "Engaged as: volunteer", "Engaged as: board_member"

**On pipeline events:** Auto-create facts:
- Enrichment complete → "Employer match: 1:1 up to $10k (source: AI research)"
- Message sent → "Outreach sent: matching gift email"
- Response received → "Responded: interested (classified by AI)"
- Agent action → "Agent: follow-up scheduled for 7 days"

This gives every supporter a growing memory log, not just static imported fields.

## 2. Next-Best-Action Scoring

Replace the heuristic `analyseNetwork` with a proper scoring engine.

**Create `convex/intelligence/nextBestAction.ts`:**

For each supporter, calculate a composite score (0-100) based on:
- **Recency decay**: when were they last engaged? (exponential decay from lastEngagement)
- **Affinity signal**: membership status + engagement depth (board > donor > volunteer > event_attendee > never)
- **Opportunity signal**: match eligible? employer changed? membership lapsing?
- **Response history**: opened emails? responded? declined?
- **Gap signal**: high-value supporter with no recent outreach = high priority

Each factor is 0-20 points, summed to a priority score.

Then assign a `recommendedAction` from the standardised types:
- `reconnect` — lapsed/former with high affinity, no recent contact
- `renew` — membership lapsing or recently lapsed
- `ask_match` — match eligible, hasn't been asked
- `share_value` — active supporter, recent engagement, give before asking
- `invite` — event attendee or volunteer, upcoming opportunity
- `ask_donate` — active donor, right timing
- `steward` — responded positively, needs follow-through
- `intro` — connector who could link others (stretch goal)

Each action comes with:
- `whyNow`: "Sarah was a board member for 3 years, left 2 years ago. Deloitte just expanded their matching programme. She hasn't heard from you since 2023."
- `actionReason`: "A warm reconnection before a matching gift ask will feel natural given her history."
- `priority`: 0-100 score

**This replaces the current `analyseNetwork` query** and feeds into Scout's tools + the detail panel.

## 3. Scout Tools — New and Updated

**Replace `analyseNetwork` with `getNextBestActions`:**
```typescript
getNextBestActions: {
  description: "Get the top recommended actions across all supporters — who to engage, why now, and what approach",
  inputSchema: z.object({
    limit: z.number().optional(),
    campaignId: z.string().optional(),
    actionType: z.string().optional(),  // filter to specific action type
  }),
}
```

Returns ranked list of supporters with: name, employer, priority score, recommendedAction, whyNow, actionReason.

**Add `getRelationshipMoments`:**
```typescript
getRelationshipMoments: {
  description: "Get time-sensitive relationship moments — memberships about to lapse, follow-ups due, responses needing action",
}
```

Returns: lapsing memberships (30/60/90 day windows), stale outreach (no open after 14 days), open responses (classified but no follow-up), agent recommendations pending.

**Add `getSupporterProfile`:**
```typescript
getSupporterProfile: {
  description: "Get full relationship profile for a supporter including facts, why-now explanation, and recommended action",
  inputSchema: z.object({ prospectName: z.string() }),
}
```

Returns the full intelligence profile that Scout can narrate: facts log, relationship strength, why now, recommended action + reason, open loops.

**Update `getBriefing`** to use next-best-actions instead of just metrics + signals.

## 4. Detail Panel — "Relationship Rewind"

**Update `components/prospect-detail-panel.tsx`:**

Add three new sections (above enrichment data):

**Why Now** — the `whyNow` text from the scoring engine. One sentence explaining why Scout thinks this person matters right now.

**Recommended Action** — the `recommendedAction` with `actionReason`. Clickable: "Draft reconnection message →"

**Relationship Timeline** — replace the current activity log with a richer timeline that includes supporter facts. Each entry shows: icon, description, source badge, date. Newest first. This is the "relationship rewind."

**Open Loops** — any pending items: scheduled follow-ups, unanswered responses, stalled sequences.

## 5. Lighter Dashboard

**Update `app/(dashboard)/dashboard/page.tsx`:**

Replace the current metrics-heavy dashboard with:
- **Scout's Top 5** — the 5 highest-priority next-best-actions, rendered as cards (name, why now, action button)
- **Open Conversations** — responses that need follow-up
- **Review Pressure** — draft count with a link to Review
- **Activity Feed** — last 10 agent/pipeline actions (existing)

Remove: the 5-column metrics row, the campaign cards grid, the send schedule, the signals panel. These are accessible through Scout ("what are my metrics?", "show me the schedule") but don't need to be on the dashboard.

## 6. Auto-Append Facts on Pipeline Events

**Update `convex/pipeline/runner.ts` and `convex/pipeline/sender.ts`:**

After each pipeline event, auto-create a supporterFact:
- Enrichment success → fact about what was found
- Message generated → fact about what was drafted
- Message sent → fact about what was sent and when
- Response classified → fact about the response intent
- Agent action → fact about what the agent did

This makes the memory grow automatically without manual notes.

---

## Files

### Create
| File | Purpose |
|------|---------|
| `convex/intelligence/nextBestAction.ts` | Scoring engine — priority score + recommended action per supporter |
| `convex/intelligence/supporterFacts.ts` | Mutations + queries for supporter facts |

### Modify
| File | Change |
|------|--------|
| `convex/schema.ts` | Add `supporterFacts` table |
| `convex/prospects/mutations.ts` | Auto-create facts on import |
| `convex/prospects/networkAnalysis.ts` | Replace with call to nextBestAction |
| `convex/prospects/intelligenceQueries.ts` | Add whyNow, recommendedAction, openLoops to profile |
| `components/prospect-detail-panel.tsx` | Add Why Now, Recommended Action, Open Loops sections |
| `app/api/chat/route.ts` | Replace analyseNetwork tool with getNextBestActions, add getSupporterProfile and getRelationshipMoments |
| `app/(dashboard)/dashboard/page.tsx` | Simplify to Scout's Top 5 + Open Conversations + Review Pressure + Activity |
| `convex/pipeline/runner.ts` | Auto-append facts after enrichment |
| `convex/pipeline/sender.ts` | Auto-append facts after send |
| `convex/pipeline/intentRouter.ts` | Auto-append facts after response classification |

---

## Verification

- [ ] Importing CSV with relationship fields auto-creates supporterFacts
- [ ] Pipeline events auto-create facts (enrichment, send, response)
- [ ] "Who should I talk to?" returns scored recommendations with whyNow explanations
- [ ] "Tell me about Sarah Mitchell" returns full relationship profile with facts + why now
- [ ] "What needs my attention today?" returns time-sensitive moments
- [ ] Detail panel shows Why Now section + Recommended Action + Open Loops
- [ ] Dashboard shows Scout's Top 5 + Open Conversations + Review Pressure
- [ ] Lapsed member at matching employer scores higher than unknown contact
- [ ] Former board member who hasn't been contacted in 2 years gets "reconnect" recommendation
- [ ] Active donor with open match opportunity gets "ask_match" recommendation

## What We're NOT Building
- Separate Dormant Network / Warm Intros / Match Follow-Through pages
- Visible "network edges" UI
- Analytics dashboards for model internals
- Anything that makes the app feel like enterprise CRM software
