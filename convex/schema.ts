import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
  }).index("by_clerk_org_id", ["clerkOrgId"]),

  orgSettings: defineTable({
    orgId: v.id("organizations"),
    key: v.string(),
    value: v.string(),
  }).index("by_org_key", ["orgId", "key"]),

  campaigns: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    type: v.union(
      v.literal("donation_matching"),
      v.literal("grant_research"),
      v.literal("corporate_sponsorship"),
      v.literal("volunteer_matching"),
      v.literal("in_kind_donation"),
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("archived"),
    ),
    description: v.optional(v.string()),
  })
    .index("by_org", ["orgId"])
    .index("by_org_status", ["orgId", "status"]),

  // Autonomous campaign settings
  campaignSettings: defineTable({
    campaignId: v.id("campaigns"),
    autoSendEnabled: v.boolean(),
    warmUpThreshold: v.optional(v.number()),  // deprecated, kept for data compat
    warmUpApproved: v.optional(v.number()),   // deprecated, kept for data compat
    confidenceThreshold: v.number(),
    dailySendLimit: v.number(),
    sendWindowStart: v.number(),
    sendWindowEnd: v.number(),
    sendTimezone: v.string(),
    paused: v.boolean(),
    followUpEnabled: v.boolean(),
    followUpDelayDays: v.number(),
    followUpMaxAttempts: v.number(),
    promptInstructions: v.optional(v.string()),
    outreachIntent: v.optional(v.string()),
  }).index("by_campaign", ["campaignId"]),

  campaignEnrichmentConfigs: defineTable({
    campaignId: v.id("campaigns"),
    enrichmentType: v.string(),
    columnOrder: v.number(),
    enabled: v.boolean(),
    config: v.optional(v.any()),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_campaign_type", ["campaignId", "enrichmentType"]),

  prospects: defineTable({
    orgId: v.id("organizations"),
    campaignId: v.optional(v.id("campaigns")),
    importBatchId: v.optional(v.id("importBatches")),
    teamListId: v.optional(v.id("prospectLists")),
    campaignListId: v.optional(v.id("prospectLists")),
    name: v.string(),
    email: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    employer: v.optional(v.string()),
    employerMatchRatio: v.optional(v.number()),
    employerMatchCap: v.optional(v.number()),
    matchEligible: v.boolean(),
    donorScore: v.optional(v.number()),
    engagementStatus: v.optional(v.string()),
    lastAgentAction: v.optional(v.number()),
    // Relationship context
    role: v.optional(v.string()),
    membershipStatus: v.optional(v.string()),
    memberSince: v.optional(v.string()),
    lastEngagement: v.optional(v.string()),
    engagementTypes: v.optional(v.array(v.string())),
    donationHistory: v.optional(v.string()),
    notes: v.optional(v.string()),
    affinity: v.optional(v.string()),
  })
    .index("by_org", ["orgId"])
    .index("by_campaign", ["campaignId"])
    .index("by_import_batch", ["importBatchId"])
    .index("by_org_email", ["orgId", "email"]),

  enrichmentResults: defineTable({
    prospectId: v.id("prospects"),
    campaignId: v.id("campaigns"),
    orgId: v.id("organizations"),
    enrichmentType: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("success"),
      v.literal("failed"),
    ),
    result: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_prospect", ["prospectId"])
    .index("by_prospect_type", ["prospectId", "campaignId", "enrichmentType"]),

  enrichmentJobs: defineTable({
    orgId: v.id("organizations"),
    campaignId: v.optional(v.id("campaigns")),
    prospectId: v.id("prospects"),
    stage: v.string(),
    errorMessage: v.optional(v.string()),
  })
    .index("by_org_prospect", ["orgId", "prospectId"])
    .index("by_campaign", ["campaignId"]),

  outreachMessages: defineTable({
    orgId: v.id("organizations"),
    campaignId: v.optional(v.id("campaigns")),
    prospectId: v.id("prospects"),
    subject: v.optional(v.string()),
    content: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("approved"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    confidenceScore: v.optional(v.number()),
    personalisationContext: v.optional(v.any()),
    sentAt: v.optional(v.number()),
    openedAt: v.optional(v.number()),
    respondedAt: v.optional(v.number()),
    sequenceStep: v.optional(v.number()),
    replyTo: v.optional(v.id("outreachMessages")),
    isReply: v.optional(v.boolean()),
    responseText: v.optional(v.string()),
    responseIntent: v.optional(v.string()),
    responseClassifiedAt: v.optional(v.number()),
  })
    .index("by_org", ["orgId"])
    .index("by_campaign", ["campaignId"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_prospect", ["prospectId"]),

  // Multi-touch outreach sequences
  outreachSequenceSteps: defineTable({
    messageId: v.id("outreachMessages"),
    campaignId: v.id("campaigns"),
    prospectId: v.id("prospects"),
    stepNumber: v.number(),
    scheduledAt: v.number(),
    sentAt: v.optional(v.number()),
    cronletTaskId: v.optional(v.string()),
    status: v.union(
      v.literal("scheduled"),
      v.literal("sent"),
      v.literal("cancelled"),
      v.literal("responded"),
    ),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_scheduled", ["status", "scheduledAt"])
    .index("by_prospect", ["prospectId"]),

  // Real-time activity log
  activityLog: defineTable({
    orgId: v.id("organizations"),
    campaignId: v.optional(v.id("campaigns")),
    prospectId: v.optional(v.id("prospects")),
    type: v.string(),
    message: v.string(),
    metadata: v.optional(v.any()),
  })
    .index("by_org", ["orgId"])
    .index("by_campaign", ["campaignId"]),

  importBatches: defineTable({
    orgId: v.id("organizations"),
    campaignId: v.optional(v.id("campaigns")),
    sourceFilename: v.optional(v.string()),
  })
    .index("by_org", ["orgId"])
    .index("by_campaign", ["campaignId"]),

  prospectLists: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    type: v.union(
      v.literal("segment"),
      v.literal("team"),
      v.literal("campaign"),
    ),
  })
    .index("by_org", ["orgId"])
    .index("by_org_type_name", ["orgId", "type", "name"]),

  prospectListMembers: defineTable({
    prospectId: v.id("prospects"),
    listId: v.id("prospectLists"),
  })
    .index("by_list", ["listId"])
    .index("by_prospect", ["prospectId"]),

  // CRM connections
  crmConnections: defineTable({
    orgId: v.id("organizations"),
    provider: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    instanceUrl: v.string(),
    lastSyncAt: v.optional(v.number()),
    syncEnabled: v.boolean(),
    syncConfig: v.optional(v.any()),
  }).index("by_org", ["orgId"]),

  crmSyncLog: defineTable({
    orgId: v.id("organizations"),
    connectionId: v.id("crmConnections"),
    direction: v.union(v.literal("push"), v.literal("pull")),
    entityType: v.string(),
    entityId: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    details: v.optional(v.string()),
  }).index("by_connection", ["connectionId"]),

  // Onboarding state
  onboardingState: defineTable({
    orgId: v.id("organizations"),
    dismissed: v.boolean(),
    completedAt: v.optional(v.number()),
  }).index("by_org", ["orgId"]),

  // Supporter facts — source-aware relationship memory
  supporterFacts: defineTable({
    orgId: v.id("organizations"),
    prospectId: v.id("prospects"),
    factType: v.string(),
    content: v.string(),
    source: v.string(),
    sourceDate: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_prospect", ["prospectId"])
    .index("by_org", ["orgId"]),
});
