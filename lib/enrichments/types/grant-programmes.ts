import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "grant_programmes",
  label: "Grant Programmes",
  description: "Extract grant programme details, deadlines, and focus areas",
  displayKey: "programme_name",
});
