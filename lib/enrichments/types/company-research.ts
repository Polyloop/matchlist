import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "company_research",
  label: "Company Research",
  description: "Research company details, size, and industry",
  displayKey: "company_name",
});
