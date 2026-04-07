export type EnrichmentStage =
  | "pending"
  | "scraped"
  | "enriched"
  | "matched"
  | "message_generated"
  | "sent"
  | "failed";

export type OutreachStatus = "draft" | "approved" | "sent" | "failed";
export type ProspectListType = "segment" | "team" | "campaign";

export type CampaignType =
  | "donation_matching"
  | "grant_research"
  | "corporate_sponsorship"
  | "volunteer_matching"
  | "in_kind_donation";

export type CampaignStatus = "draft" | "active" | "completed" | "archived";

export interface Organization {
  id: string;
  clerk_org_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  org_id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignEnrichmentConfig {
  id: string;
  campaign_id: string;
  enrichment_type: string;
  column_order: number;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Prospect {
  id: string;
  org_id: string;
  campaign_id: string | null;
  name: string;
  email: string | null;
  linkedin_url: string | null;
  employer: string | null;
  employer_match_ratio: number | null;
  employer_match_cap: number | null;
  match_eligible: boolean;
  import_batch_id: string | null;
  team_list_id: string | null;
  campaign_list_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectList {
  id: string;
  org_id: string;
  name: string;
  type: ProspectListType;
  created_at: string;
}

export interface ImportBatch {
  id: string;
  org_id: string;
  campaign_id: string | null;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnrichmentJob {
  id: string;
  org_id: string;
  campaign_id: string | null;
  prospect_id: string;
  stage: EnrichmentStage;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachMessage {
  id: string;
  org_id: string;
  campaign_id: string | null;
  prospect_id: string;
  content: string;
  status: OutreachStatus;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export type EnrichmentResultStatus = "pending" | "running" | "success" | "failed";

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

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Organization, "id">>;
      };
      campaigns: {
        Row: Campaign;
        Insert: Omit<Campaign, "id" | "created_at" | "updated_at" | "status"> & {
          status?: CampaignStatus;
        };
        Update: Partial<Omit<Campaign, "id">>;
      };
      campaign_enrichment_configs: {
        Row: CampaignEnrichmentConfig;
        Insert: Omit<CampaignEnrichmentConfig, "id" | "created_at" | "updated_at"> & {
          enabled?: boolean;
          config?: Record<string, unknown>;
        };
        Update: Partial<Omit<CampaignEnrichmentConfig, "id">>;
      };
      prospects: {
        Row: Prospect;
        Insert: Omit<Prospect, "id" | "created_at" | "updated_at" | "match_eligible"> & {
          match_eligible?: boolean;
        };
        Update: Partial<Omit<Prospect, "id">>;
      };
      prospect_lists: {
        Row: ProspectList;
        Insert: Omit<ProspectList, "id" | "created_at">;
        Update: Partial<Omit<ProspectList, "id">>;
      };
      import_batches: {
        Row: ImportBatch;
        Insert: Omit<ImportBatch, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ImportBatch, "id">>;
      };
      enrichment_jobs: {
        Row: EnrichmentJob;
        Insert: Omit<EnrichmentJob, "id" | "created_at" | "updated_at" | "error_message" | "stage"> & {
          stage?: EnrichmentStage;
          error_message?: string | null;
        };
        Update: Partial<Omit<EnrichmentJob, "id">>;
      };
      outreach_messages: {
        Row: OutreachMessage;
        Insert: Omit<OutreachMessage, "id" | "created_at" | "updated_at" | "sent_at"> & {
          sent_at?: string | null;
        };
        Update: Partial<Omit<OutreachMessage, "id">>;
      };
      enrichment_results: {
        Row: EnrichmentResult;
        Insert: Omit<EnrichmentResult, "id" | "created_at" | "updated_at" | "error_message" | "result"> & {
          result?: Record<string, unknown> | null;
          error_message?: string | null;
        };
        Update: Partial<Omit<EnrichmentResult, "id">>;
      };
    };
  };
};
