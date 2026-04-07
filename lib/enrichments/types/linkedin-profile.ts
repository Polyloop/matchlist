import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "linkedin_profile",
  label: "LinkedIn Profile",
  description: "Scrape LinkedIn profile to extract current employer and role",
  displayKey: "profile_url",
});
