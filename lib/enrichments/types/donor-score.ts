import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "donor_score",
  label: "Score",
  description: "AI-scored likelihood to convert based on all enrichment data",
  displayKey: "score",
  formatValue: (value) => `${value}/100`,
});
