# Plan: Response Detection, Duplicate Detection, Campaign Templates

## Context

Three killer features to move the platform from "sender" to "conversation manager": detecting when prospects reply, preventing embarrassing duplicate outreach, and reducing onboarding friction with pre-built campaign templates.

---

## 1. Response Detection

**Goal:** When a prospect replies to an outreach email, the platform detects it, surfaces it in the Review inbox, pauses the follow-up sequence, and notifies the user.

### How it works

Resend doesn't provide reply detection via webhooks — it only tracks delivered/opened/bounced. Two approaches:

**Approach A: Reply-To webhook (recommended for now)**
- Set a unique `Reply-To` header per message: `reply+{messageId}@yourdomain.com`
- Configure an inbound email handler (Resend supports inbound, or use a catch-all mailbox with webhook forwarding)
- When a reply arrives, the `+{messageId}` tells us which outreach message it's responding to

**Approach B: Simpler — manual "Mark as Responded" button**
- Add a "Mark as Responded" action in the Review inbox detail pane
- User clicks it when they see a reply in their email
- This is low-tech but ships immediately and covers 90% of the need

**Plan: Build both.** Button ships now, inbound email wiring is a follow-up.

### Schema changes

No new tables needed. Existing fields:
- `outreachMessages.respondedAt` — already exists
- `outreachSequenceSteps.status: "responded"` — already exists

### Convex changes

**`convex/outreach/mutations.ts`** — Add `markResponded` mutation:
- Sets `respondedAt = Date.now()` on the message
- Cancels all future sequence steps for this prospect (set status to "responded")
- Cancels any pending Cronlet tasks for this prospect's follow-ups
- Logs activity: "Response received from {name}"

**`convex/pipeline/helpers.ts`** — Add `cancelProspectFollowUps` internal mutation:
- Query `outreachSequenceSteps` by prospect, status "scheduled"
- Set each to "responded"
- If `cronletTaskId` exists, pause the Cronlet task

### UI changes

**`components/review/message-detail.tsx`** — Add "Mark as Responded" button:
- Shows on sent messages that don't have `respondedAt`
- Green button with check icon
- On click: calls `markResponded`, shows toast

**`components/review/message-list.tsx`** — Add "responded" status:
- New badge style: blue with "Responded" label
- Left border: blue

**Status tabs in message list** — Add "Responded" tab

**Dashboard** — `analytics/queries.ts` `global` query already counts `responded`. No changes needed.

**Activity feed** — Response events already logged by the mutation.

---

## 2. Duplicate Detection

**Goal:** When importing prospects, detect if the same person (by email) already exists in another campaign or the same campaign, and warn the user before importing.

### How it works

**On import:**
1. Before inserting prospects, scan the import batch for duplicates:
   - Within the batch itself (same email appears twice in the CSV)
   - Against existing prospects in the same campaign
   - Against existing prospects in other campaigns for this org
2. Surface duplicates to the user with options:
   - Skip duplicates
   - Import anyway (create separate records)
   - Merge (update existing record with new data)

**On the prospects table:**
- Show a warning badge on prospects that share an email with another prospect in a different campaign

### Schema changes

Add an index to prospects for email lookup:
```
prospects.index("by_org_email", ["orgId", "email"])
```

### Convex changes

**`convex/prospects/queries.ts`** — Add `checkDuplicates` query:
```typescript
args: { orgId, emails: string[] }
returns: { email: string, existingCampaigns: string[], prospectId: string }[]
```

**`convex/prospects/mutations.ts`** — Update `importProspects`:
- Before import, run duplicate check
- Return duplicates in the response alongside imported count
- Add `skipDuplicates` arg (boolean) — if true, skip emails that already exist in same campaign

### UI changes

**`components/csv-upload.tsx`** — After column mapping (step 2), before final import (step 3):
- Run duplicate check against the mapped email column
- If duplicates found, show a warning card:
  - "3 prospects already exist in other campaigns"
  - List each with: name, email, campaign name
  - Options: "Skip Duplicates" / "Import Anyway"
- Store the user's choice and pass to import mutation

**Campaign Table tab** — Show a small warning icon next to prospect name if they exist in multiple campaigns. Tooltip shows which other campaigns.

---

## 3. Campaign Templates (Playbooks)

**Goal:** Pre-built campaign configurations with sample data, prompt tuning, and sequence settings. User selects a template instead of starting from scratch.

### Template structure

Each template includes:
- Campaign type (donation_matching, etc.)
- Name suggestion
- Description
- Pre-tuned enrichment config (which steps, in what order)
- Campaign settings overrides (send window, follow-up config, confidence threshold)
- Sample CSV data (optional, for demo)
- Custom prompt instructions (appended to the AI system prompt)

### Where templates live

**`lib/campaigns/templates.ts`** — Static template definitions (no DB needed):

```typescript
interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  campaignType: CampaignType;
  tags: string[];
  settings: Partial<CampaignSettings>;
  promptInstructions?: string;  // Extra instructions appended to AI prompt
  sampleData?: Array<Record<string, string>>;  // Sample CSV rows for preview
}
```

**Templates to ship:**

1. **Spring Gala Follow-Up** (donation_matching)
   - "Reach out to gala attendees about employer matching gift programmes"
   - Settings: follow-ups on, 5-day delay, 2 max, confidence 75%
   - Prompt: reference the gala, warm tone

2. **Year-End Giving Push** (donation_matching)
   - "End-of-year campaign targeting donors whose employers match gifts"
   - Settings: higher daily limit (60), urgency in follow-ups
   - Prompt: reference tax deadline, year-end giving

3. **Corporate Build Day** (volunteer_matching)
   - "Find companies for team volunteer build days"
   - Settings: follow-ups on, 7-day delay
   - Prompt: propose specific dates, team size options

4. **Annual Report Sponsors** (corporate_sponsorship)
   - "Secure sponsors for the annual report"
   - Settings: confidence 80%, 3 follow-ups
   - Prompt: mention visibility in report, donor recognition

5. **Foundation Grant Pipeline** (grant_research)
   - "Research and apply to community foundations"
   - Settings: no auto-send (LOIs need careful review)
   - Prompt: formal tone, evidence-based

6. **Office Supply Drive** (in_kind_donation)
   - "Request office supplies and materials from local businesses"
   - Settings: follow-ups on, 5-day delay
   - Prompt: be specific about needs, mention tax deduction

### UI changes

**Campaign creation wizard** (`app/(dashboard)/campaigns/new/page.tsx`):

Currently: Step 1 = choose type → Step 2 = name → Step 3 = review

New flow: Step 1 = **choose template or start blank** → Step 2 = name (pre-filled from template) → Step 3 = review (shows template settings)

Step 1 redesign:
- Two sections: "Start from a template" (grid of template cards) and "Start blank" (the existing type selector)
- Template cards show: name, description, campaign type badge, tags
- Selecting a template pre-fills: type, name, description, settings overrides, prompt instructions
- "Start blank" expands to show the 5 type cards as before

**Campaign settings** — If created from template, show the `promptInstructions` as an editable field in settings. This gets appended to the AI system prompt.

### Convex changes

**`convex/campaigns/mutations.ts`** — Update `create` to accept optional `templateId` and `promptInstructions`:
- `promptInstructions` stored in `campaignSettings` (add field to schema)
- Settings overrides applied from template

**`convex/pipeline/ai/templates.ts`** — If `promptInstructions` exist on campaign settings, append them to the system prompt.

**`convex/pipeline/runner.ts`** — Fetch `promptInstructions` from campaign settings and pass to prompt context.

### Schema addition

Add to `campaignSettings`:
```
promptInstructions: v.optional(v.string()),
```

---

## Files Summary

### Create
| File | Purpose |
|------|---------|
| `lib/campaigns/templates.ts` | 6 pre-built campaign templates |
| `convex/prospects/duplicates.ts` | Duplicate check query |

### Modify
| File | Change |
|------|--------|
| `convex/schema.ts` | Add `by_org_email` index on prospects, add `promptInstructions` to campaignSettings |
| `convex/outreach/mutations.ts` | Add `markResponded` mutation |
| `convex/pipeline/helpers.ts` | Add `cancelProspectFollowUps` mutation |
| `convex/prospects/mutations.ts` | Add `skipDuplicates` arg to import, return duplicates |
| `convex/campaigns/mutations.ts` | Accept `templateId` + `promptInstructions` on create |
| `convex/pipeline/ai/templates.ts` | Append `promptInstructions` to system prompt |
| `convex/pipeline/runner.ts` | Fetch + pass `promptInstructions` |
| `components/review/message-detail.tsx` | Add "Mark as Responded" button |
| `components/review/message-list.tsx` | Add "Responded" status badge + tab + blue border |
| `components/csv-upload.tsx` | Duplicate detection step before import |
| `app/(dashboard)/campaigns/new/page.tsx` | Template selection in step 1 |

---

## Verification

### Response Detection
- [ ] "Mark as Responded" button shows on sent messages
- [ ] Clicking it sets respondedAt, cancels follow-up sequences
- [ ] Responded messages show blue badge in Review list
- [ ] Activity feed shows "Response received" event
- [ ] Dashboard response rate metric updates

### Duplicate Detection
- [ ] Importing a CSV with an email that exists in another campaign shows warning
- [ ] "Skip Duplicates" removes them from import
- [ ] "Import Anyway" creates separate records
- [ ] Same email within one CSV is caught

### Campaign Templates
- [ ] Campaign creation shows template grid before blank type selection
- [ ] Selecting a template pre-fills name, type, description, settings
- [ ] Template prompt instructions appear in campaign settings
- [ ] AI messages use template-specific instructions
- [ ] All 6 templates render correctly with descriptions and tags
