import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "employer_lookup",
  label: "Employer",
  description: "Look up the prospect's current employer from LinkedIn data",
  displayKey: "employer",
});
