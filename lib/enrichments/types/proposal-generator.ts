import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "proposal_generator",
  label: "Proposal Draft",
  description: "Generate a sponsorship proposal using AI",
  displayKey: "proposal_preview",
  formatValue: (value) => {
    const str = String(value || "");
    return str.length > 60 ? str.slice(0, 60) + "..." : str;
  },
});
