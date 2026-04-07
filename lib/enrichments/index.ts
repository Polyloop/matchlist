// Register all built-in enrichment types
// Import order doesn't matter — side-effects register into the global registry

// Donation matching
import "./types/linkedin-profile";
import "./types/employer-lookup";
import "./types/match-programme";
import "./types/ai-message";

// Grant research
import "./types/foundation-lookup";
import "./types/grant-programmes";
import "./types/eligibility-check";
import "./types/loi-generator";

// Corporate sponsorship
import "./types/company-research";
import "./types/csr-signals";
import "./types/contact-enrichment";
import "./types/proposal-generator";

// Volunteer matching
import "./types/volunteer-programme";
import "./types/coordinator-lookup";
import "./types/outreach-generator";

// In-kind donation
import "./types/donation-programme";
import "./types/procurement-contact";
import "./types/request-generator";

// Cross-campaign enrichments
import "./types/website-intelligence";
import "./types/donor-score";

export {
  getEnrichmentType,
  getDisplayValue,
  getAllEnrichmentTypes,
} from "./registry";
