import type { CampaignType } from "@/lib/supabase/types";

export interface CampaignTypeConfig {
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultEnrichments: Array<{
    enrichment_type: string;
    column_order: number;
    enabled: boolean;
  }>;
}

export const CAMPAIGN_TYPE_CONFIGS: Record<CampaignType, CampaignTypeConfig> = {
  donation_matching: {
    label: "Donation Matching",
    description:
      "Identify employers with matching gift programmes and automate personalised outreach to maximise donations",
    icon: "gift",
    color: "text-emerald-600",
    defaultEnrichments: [
      { enrichment_type: "linkedin_profile", column_order: 0, enabled: true },
      { enrichment_type: "employer_lookup", column_order: 1, enabled: true },
      { enrichment_type: "match_programme", column_order: 2, enabled: true },
      { enrichment_type: "ai_message", column_order: 3, enabled: true },
    ],
  },
  grant_research: {
    label: "Grant Research",
    description:
      "Research foundations offering grants, evaluate eligibility, and auto-generate letters of inquiry",
    icon: "search",
    color: "text-blue-600",
    defaultEnrichments: [
      { enrichment_type: "foundation_lookup", column_order: 0, enabled: true },
      { enrichment_type: "grant_programmes", column_order: 1, enabled: true },
      { enrichment_type: "eligibility_check", column_order: 2, enabled: true },
      { enrichment_type: "loi_generator", column_order: 3, enabled: true },
    ],
  },
  corporate_sponsorship: {
    label: "Corporate Sponsorship",
    description:
      "Find companies with CSR budgets, pull marketing/partnerships contacts, and generate sponsorship proposals",
    icon: "building",
    color: "text-violet-600",
    defaultEnrichments: [
      { enrichment_type: "company_research", column_order: 0, enabled: true },
      { enrichment_type: "csr_signals", column_order: 1, enabled: true },
      { enrichment_type: "contact_enrichment", column_order: 2, enabled: true },
      { enrichment_type: "proposal_generator", column_order: 3, enabled: true },
    ],
  },
  volunteer_matching: {
    label: "Volunteer Matching",
    description:
      "Identify companies with employee volunteer programmes, find coordinators, and generate partnership outreach",
    icon: "people",
    color: "text-amber-600",
    defaultEnrichments: [
      { enrichment_type: "company_research", column_order: 0, enabled: true },
      { enrichment_type: "volunteer_programme", column_order: 1, enabled: true },
      { enrichment_type: "coordinator_lookup", column_order: 2, enabled: true },
      { enrichment_type: "outreach_generator", column_order: 3, enabled: true },
    ],
  },
  in_kind_donation: {
    label: "In-Kind Donation",
    description:
      "Discover companies that donate products or services, find procurement contacts, and generate donation requests",
    icon: "package",
    color: "text-rose-600",
    defaultEnrichments: [
      { enrichment_type: "company_research", column_order: 0, enabled: true },
      { enrichment_type: "donation_programme", column_order: 1, enabled: true },
      { enrichment_type: "procurement_contact", column_order: 2, enabled: true },
      { enrichment_type: "request_generator", column_order: 3, enabled: true },
    ],
  },
};

export const CAMPAIGN_TYPES = Object.keys(CAMPAIGN_TYPE_CONFIGS) as CampaignType[];
