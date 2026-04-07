import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "foundation_lookup",
  label: "Foundation",
  description: "Look up foundation details from grant databases",
  displayKey: "foundation_name",
});
