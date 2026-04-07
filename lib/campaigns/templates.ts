import type { CampaignType } from "@/lib/types";

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  campaignType: CampaignType;
  tags: string[];
  settings: {
    autoSendEnabled?: boolean;
    confidenceThreshold?: number;
    dailySendLimit?: number;
    followUpEnabled?: boolean;
    followUpDelayDays?: number;
    followUpMaxAttempts?: number;
  };
  promptInstructions?: string;
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "spring-gala",
    name: "Spring Gala Follow-Up",
    description: "Reach out to gala attendees about employer matching gift programmes. Warm, personal tone referencing the event.",
    campaignType: "donation_matching",
    tags: ["event", "matching gifts", "warm"],
    settings: {
      followUpEnabled: true,
      followUpDelayDays: 5,
      followUpMaxAttempts: 2,
      confidenceThreshold: 75,
    },
    promptInstructions: "Reference that the recipient recently attended our gala event. Use a warm, grateful tone. Mention the energy and generosity at the event before introducing the matching gift opportunity.",
  },
  {
    id: "year-end-giving",
    name: "Year-End Giving Push",
    description: "End-of-year campaign targeting donors whose employers match gifts. Urgency around tax deadline.",
    campaignType: "donation_matching",
    tags: ["year-end", "urgency", "tax deadline"],
    settings: {
      dailySendLimit: 60,
      followUpEnabled: true,
      followUpDelayDays: 3,
      followUpMaxAttempts: 2,
      confidenceThreshold: 70,
    },
    promptInstructions: "Create urgency around the year-end tax deadline. Mention that matching gift submissions often need to be completed before December 31st. Keep it concise and action-oriented.",
  },
  {
    id: "corporate-build-day",
    name: "Corporate Build Day",
    description: "Find companies for team volunteer build days. Propose specific dates and team activities.",
    campaignType: "volunteer_matching",
    tags: ["team building", "volunteer", "hands-on"],
    settings: {
      followUpEnabled: true,
      followUpDelayDays: 7,
      followUpMaxAttempts: 2,
    },
    promptInstructions: "Propose a specific upcoming build day date. Emphasise team building benefits and that no construction experience is needed. Mention lunch is provided and the day typically runs 9am-3pm.",
  },
  {
    id: "annual-report-sponsors",
    name: "Annual Report Sponsors",
    description: "Secure corporate sponsors for the annual report. Tiered sponsorship levels with recognition benefits.",
    campaignType: "corporate_sponsorship",
    tags: ["annual report", "visibility", "tiered"],
    settings: {
      confidenceThreshold: 80,
      followUpEnabled: true,
      followUpDelayDays: 7,
      followUpMaxAttempts: 3,
    },
    promptInstructions: "Mention specific sponsorship tiers (Gold, Silver, Bronze) and the visibility each provides in the annual report, website, and events. Reference the report's distribution reach.",
  },
  {
    id: "foundation-grants",
    name: "Foundation Grant Pipeline",
    description: "Research and apply to community foundations with housing or community development focus.",
    campaignType: "grant_research",
    tags: ["grants", "foundations", "LOI"],
    settings: {
      autoSendEnabled: false,
      confidenceThreshold: 90,
      followUpEnabled: false,
    },
    promptInstructions: "Write formal letters of inquiry. Reference the foundation's stated focus areas and recent grants. Include specific project outcomes and budget figures where possible. LOIs must be reviewed before sending.",
  },
  {
    id: "office-supply-drive",
    name: "Office Supply Drive",
    description: "Request office supplies and materials from local businesses. Mention tax deduction benefits.",
    campaignType: "in_kind_donation",
    tags: ["supplies", "local", "tax deduction"],
    settings: {
      followUpEnabled: true,
      followUpDelayDays: 5,
      followUpMaxAttempts: 1,
    },
    promptInstructions: "Be specific about what supplies are needed (desks, chairs, computers, printer paper, etc.). Mention the tax deduction benefit for businesses. Offer to arrange pickup to make it easy.",
  },
];
