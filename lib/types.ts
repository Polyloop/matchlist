// Shared TypeScript types used across the app
// These are display/UI types — the source of truth is the Convex schema

export type CampaignType =
  | "donation_matching"
  | "grant_research"
  | "corporate_sponsorship"
  | "volunteer_matching"
  | "in_kind_donation";

export type CampaignStatus = "draft" | "active" | "completed" | "archived";

export type EnrichmentStage =
  | "pending"
  | "scraped"
  | "enriched"
  | "matched"
  | "message_generated"
  | "sent"
  | "failed";

export type EnrichmentResultStatus = "pending" | "running" | "success" | "failed";

export type OutreachStatus = "draft" | "approved" | "sent" | "failed";

export interface EnrichmentResult {
  id: string;
  prospect_id: string;
  campaign_id: string;
  org_id: string;
  enrichment_type: string;
  status: EnrichmentResultStatus;
  result: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
