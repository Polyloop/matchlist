import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "contact_enrichment",
  label: "Contact",
  description: "Find relevant contacts (marketing, partnerships, CSR)",
  displayKey: "contact_name",
});
