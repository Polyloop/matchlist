# Plan: AI Reply Suggestions, Website Scraping, Donor Scoring, CRM Sync

## Context

4 remaining killer features. We already built response detection (#1), campaign templates (#4), and duplicate detection (#6). Now building the rest:
- **#2** AI reply suggestions — close the conversation loop
- **#3** Website scraping enrichment via Firecrawl — richer personalisation
- **#5** Donor potential scoring — prioritise high-value prospects
- **#7** CRM sync — Salesforce NPSP first

---

## 1. AI Reply Suggestions

**Goal:** When a response is marked (via "Mark as Responded"), AI drafts a reply using the full conversation context. User reviews, edits, and sends from the Review inbox.

### Schema changes

Add to `outreachMessages` schema:
```
replyTo: v.optional(v.id("outreachMessages")),  // links reply to original message
isReply: v.optional(v.boolean()),
```

Add new table for conversation threads:
```
conversations: defineTable({
  orgId: v.id("organizations"),
  campaignId: v.id("campaigns"),
  prospectId: v.id("prospects"),
  messageIds: v.array(v.id("outreachMessages")),  // ordered thread
})
  .index("by_prospect", ["prospectId"])
  .index("by_campaign", ["campaignId"]),
```

### Convex changes

**`convex/outreach/mutations.ts`** — Update `markResponded`:
- After marking responded, schedule AI reply generation
- `ctx.scheduler.runAfter(0, internal.pipeline.replyGenerator.generateReply, { ... })`

**`convex/pipeline/replyGenerator.ts`** (new) — Internal action:
- Fetch the original outreach message + all enrichment data
- Fetch prospect info
- Call Claude via AI SDK with conversation context:
  - System: "You are replying to a prospect who responded to your outreach. Draft a brief, helpful reply."
  - User: "Original message: [...]\nThe prospect has responded (we don't have the reply text yet, but they engaged). Write a warm follow-up that moves the conversation forward."
- Create a new `outreachMessages` record with `isReply: true`, `replyTo: originalMessageId`, status "draft"
- Log activity: "AI reply drafted for {name}"

**`convex/outreach/queries.ts`** — Update `list`:
- Include `replyTo` and `isReply` in returned data
- Group replies with their parent message

### UI changes

**`components/review/message-detail.tsx`**:
- When "Mark as Responded" is clicked and succeeds, show a loading state: "Drafting reply..."
- After the reply draft appears (reactive via useQuery), show it below the original message in a thread view
- Reply draft has the same Edit/Approve/Send controls
- Thread view: original message (dimmed) → "Prospect responded" divider → AI draft reply

**`components/review/message-list.tsx`**:
- Messages with `isReply: true` show a "Reply" badge
- Reply messages grouped under their parent (indented or with a thread indicator)

---

## 2. Website Scraping Enrichment (Firecrawl)

**Goal:** New enrichment type `website_intelligence` that scrapes a company's website and extracts CSR info, news, about page, and company values. Fed into AI message generation for deeper personalisation.

### Setup

```bash
pnpm add @mendable/firecrawl-js
```

Firecrawl API key stored in org settings: `FIRECRAWL_API_KEY`

### Enrichment type registration

**`lib/enrichments/types/website-intelligence.ts`** (new):
```typescript
registerEnrichmentType({
  type: "website_intelligence",
  label: "Website Intel",
  description: "Scrape company website for CSR, news, and values",
  displayKey: "summary",
});
```

### Convex changes

**`convex/pipeline/runner.ts`** — Add `website_intelligence` case to `executeEnrichment`:
```
1. Get FIRECRAWL_API_KEY from org settings
2. Get company website URL (from prospect.employer or enrichment result)
3. Call Firecrawl /extract endpoint with schema:
   {
     csr_programmes: "string[]",
     matching_gift_info: "string",
     volunteer_programmes: "string",
     company_values: "string[]",
     recent_news: "string[]",
     about_summary: "string",
     leadership: "string[]",
   }
4. Return structured result
```

**Fallback:** If no Firecrawl key, try to construct a company URL from employer name (`https://{employer.toLowerCase().replace(/\s+/g, '')}.com`) and scrape with a basic fetch + AI extraction.

### Pipeline integration

Add `website_intelligence` as an optional enrichment step for all campaign types. Insert it early in the chain (after employer_lookup, before AI message generation) so the scraped data feeds into the AI prompt.

**`lib/campaigns/types.ts`** — Update default enrichments for donation_matching:
```
{ enrichment_type: "linkedin_profile", column_order: 0 },
{ enrichment_type: "employer_lookup", column_order: 1 },
{ enrichment_type: "website_intelligence", column_order: 2 },  // NEW
{ enrichment_type: "match_programme", column_order: 3 },
{ enrichment_type: "ai_message", column_order: 4 },
```

Similar for other campaign types — add after company_research/employer_lookup.

### Settings UI

**`components/settings-form.tsx`** — Add Firecrawl to API key fields:
```
{ key: "FIRECRAWL_API_KEY", label: "Website Intelligence", description: "Powered by Firecrawl", icon: GlobeIcon }
```

---

## 3. Donor Potential Scoring

**Goal:** AI scores each prospect on likelihood to convert (0-100). Score visible as a column in the campaign table, sortable. Based on all available enrichment data.

### Approach

New enrichment type `donor_score` that runs after all other enrichments complete. Uses Claude to analyse all enrichment results and assign a score with reasoning.

### Enrichment type registration

**`lib/enrichments/types/donor-score.ts`** (new):
```typescript
registerEnrichmentType({
  type: "donor_score",
  label: "Score",
  description: "AI-scored likelihood to convert based on all enrichment data",
  displayKey: "score",
  formatValue: (value) => `${value}/100`,
});
```

### Convex changes

**`convex/pipeline/runner.ts`** — Add `donor_score` case to `executeEnrichment`:
- This is different from other enrichments — it reads ALL previous enrichment results for this prospect
- Calls Claude with a scoring prompt:
  ```
  System: "Score this prospect 0-100 on likelihood to engage with our outreach. Consider: employer size, match programme generosity, role seniority, CSR activity, website intelligence. Return JSON: { score: number, reasoning: string, signals: string[] }"

  User: "Prospect: {name}, {employer}, {email}\nEnrichment data: {all results}"
  ```
- Uses `generateObject` from AI SDK with a Zod schema for type-safe structured output
- Returns `{ score: 85, reasoning: "Large employer with active match programme...", signals: ["match_eligible", "csr_active", "senior_role"] }`

### Pipeline integration

Add as the LAST enrichment step before `ai_message`:
```
{ enrichment_type: "donor_score", column_order: N-1 },
{ enrichment_type: "ai_message", column_order: N },
```

The score also feeds into the AI message prompt — higher-scored prospects get more tailored messages.

### Also update prospect record

When donor_score completes, write the score back to a new field on the prospect for easy sorting:
- Add `donorScore: v.optional(v.number())` to prospects schema
- Pipeline updates prospect after scoring

### UI

- Score column in campaign table shows as a number with color coding:
  - 80+ green
  - 60-79 amber
  - <60 muted
- Table sortable by score
- Campaign analytics shows score distribution chart

---

## 4. CRM Sync — Salesforce NPSP

**Goal:** Two-way sync with Salesforce Non-Profit Success Pack. Push outreach activity to Salesforce, pull contact data from Salesforce.

### Approach

Build a generic CRM sync framework with Salesforce as the first adapter. This lets us add HubSpot, Bloomerang etc. later.

### Schema

```
crmConnections: defineTable({
  orgId: v.id("organizations"),
  provider: v.string(),  // "salesforce", "hubspot", etc.
  accessToken: v.string(),
  refreshToken: v.string(),
  instanceUrl: v.string(),  // e.g. https://yourorg.my.salesforce.com
  lastSyncAt: v.optional(v.number()),
  syncEnabled: v.boolean(),
  syncConfig: v.optional(v.any()),  // provider-specific config
}).index("by_org", ["orgId"]),

crmSyncLog: defineTable({
  orgId: v.id("organizations"),
  connectionId: v.id("crmConnections"),
  direction: v.union(v.literal("push"), v.literal("pull")),
  entityType: v.string(),  // "contact", "activity", "opportunity"
  entityId: v.string(),
  status: v.union(v.literal("success"), v.literal("failed")),
  details: v.optional(v.string()),
}).index("by_connection", ["connectionId"]),
```

### OAuth flow

Salesforce uses OAuth 2.0. Need:
1. **Connected App** in Salesforce with callback URL
2. **OAuth redirect route** — Next.js API route (one of the few we need to keep): `/app/api/auth/salesforce/route.ts`
   - GET: Redirects to Salesforce OAuth authorize URL
   - Callback receives auth code, exchanges for access + refresh tokens
   - Stores tokens in `crmConnections`

Since we deleted API routes, we'll use a Convex HTTP action for the callback:
- `convex/http.ts` — Add `GET /auth/salesforce/callback`

### Sync operations

**`convex/crm/salesforce.ts`** (new) — Salesforce adapter:

**Pull contacts:**
- Query Salesforce NPSP Contact object
- Map fields: Name, Email, Account (employer), Title, npe01__HomeEmail__c, etc.
- Create/update prospects in Matchlist
- Scheduled via Cronlet: daily pull at 6am

**Push outreach activity:**
- When a message is sent, create a Salesforce Task linked to the Contact
- Fields: Subject, Description (message content), Status (Completed), ActivityDate
- When a response is marked, update the Task

**Push match data:**
- When match_programme enrichment completes, update a custom field on the Contact: `Matching_Gift_Eligible__c`, `Matching_Gift_Ratio__c`

### Settings UI

**New "Integrations" section or tab in Settings:**
- "Connect Salesforce" button → starts OAuth flow
- Connected state shows: instance URL, last sync time, sync toggle
- Disconnect button
- Manual "Sync Now" button

### Sync scheduling via Cronlet

When connection is created:
- Schedule recurring Cronlet task: `daily at 06:00` for pull sync
- Push sync happens in real-time (triggered by mutations)

---

## Files Summary

### Create
| File | Purpose |
|------|---------|
| `convex/pipeline/replyGenerator.ts` | AI reply generation action |
| `convex/crm/salesforce.ts` | Salesforce NPSP adapter (pull contacts, push activity) |
| `lib/enrichments/types/website-intelligence.ts` | Firecrawl enrichment type |
| `lib/enrichments/types/donor-score.ts` | AI scoring enrichment type |

### Modify
| File | Change |
|------|--------|
| `convex/schema.ts` | Add `replyTo`, `isReply` to outreachMessages. Add `conversations` table. Add `donorScore` to prospects. Add `crmConnections`, `crmSyncLog` tables. |
| `convex/outreach/mutations.ts` | Update `markResponded` to schedule reply generation |
| `convex/outreach/queries.ts` | Include reply threading data |
| `convex/pipeline/runner.ts` | Add `website_intelligence` and `donor_score` cases to executeEnrichment |
| `convex/http.ts` | Add Salesforce OAuth callback route |
| `lib/campaigns/types.ts` | Add `website_intelligence` and `donor_score` to default enrichment chains |
| `lib/enrichments/index.ts` | Register new enrichment types |
| `components/settings-form.tsx` | Add Firecrawl API key field, Salesforce connect button |
| `components/review/message-detail.tsx` | Thread view for replies, reply draft controls |
| `components/review/message-list.tsx` | Reply badge, thread grouping |

### Install
```bash
pnpm add @mendable/firecrawl-js jsforce  # Firecrawl + Salesforce SDK
```

---

## Verification

### AI Reply Suggestions
- [ ] Mark message as responded → AI reply draft appears (reactive)
- [ ] Reply shows in thread view below original message
- [ ] Can edit, approve, and send the reply
- [ ] Reply has `isReply: true` and `replyTo` pointing to original

### Website Scraping
- [ ] With Firecrawl key set, `website_intelligence` enrichment returns structured CSR/news/values data
- [ ] Data visible in enrichment column cell
- [ ] Data feeds into AI message generation (more personalised copy)
- [ ] Without key, returns stub with note

### Donor Scoring
- [ ] `donor_score` enrichment runs after all others
- [ ] Returns 0-100 score with reasoning
- [ ] Score visible as a column, sortable
- [ ] Color-coded: green (80+), amber (60-79), muted (<60)
- [ ] Score feeds into AI message generation

### Salesforce NPSP
- [ ] "Connect Salesforce" initiates OAuth flow
- [ ] Tokens stored securely
- [ ] Pull sync imports contacts as prospects
- [ ] Push sync creates Tasks for sent messages
- [ ] Match data pushed to custom fields
- [ ] Daily sync scheduled via Cronlet
- [ ] Disconnect clears tokens
